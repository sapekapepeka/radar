#pragma once

#include <windows.h>
#include <winhttp.h>

#include <string>
#include <vector>

#pragma comment(lib, "winhttp.lib")

class RelayClient
{
private:
    HINTERNET session_ = nullptr;
    HINTERNET connect_ = nullptr;
    HINTERNET request_ = nullptr;
    HINTERNET websocket_ = nullptr;

    std::string game_id_;

private:
    bool receiveText(std::string& output)
    {
        output.clear();

        if (!websocket_)
            return false;

        std::vector<char> buffer(8192);

        for (;;)
        {
            DWORD bytesRead = 0;
            WINHTTP_WEB_SOCKET_BUFFER_TYPE type{};

            const DWORD result =
                WinHttpWebSocketReceive(
                    websocket_,
                    buffer.data(),
                    static_cast<DWORD>(buffer.size()),
                    &bytesRead,
                    &type
                );

            if (result != NO_ERROR)
                return false;

            if (type ==
                    WINHTTP_WEB_SOCKET_UTF8_MESSAGE_BUFFER_TYPE ||
                type ==
                    WINHTTP_WEB_SOCKET_UTF8_FRAGMENT_BUFFER_TYPE)
            {
                output.append(
                    buffer.data(),
                    bytesRead
                );
            }

            if (type ==
                WINHTTP_WEB_SOCKET_UTF8_MESSAGE_BUFFER_TYPE)
            {
                return true;
            }

            if (type ==
                WINHTTP_WEB_SOCKET_CLOSE_BUFFER_TYPE)
            {
                return false;
            }
        }
    }

    static std::string extractJsonString(
        const std::string& json,
        const char* key)
    {
        const std::string needle =
            std::string("\"") +
            key +
            "\":\"";

        const std::size_t start =
            json.find(needle);

        if (start == std::string::npos)
            return {};

        const std::size_t valueStart =
            start + needle.size();

        const std::size_t valueEnd =
            json.find(
                '"',
                valueStart
            );

        if (valueEnd == std::string::npos)
            return {};

        return json.substr(
            valueStart,
            valueEnd - valueStart
        );
    }

public:
    bool Connect(
        const wchar_t* host,
        const wchar_t* path)
    {
        // =========================================
        // WINHTTP SESSION
        // =========================================

        session_ = WinHttpOpen(
            L"cs2-webradar-relay/1.0",
            WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,
            nullptr,
            nullptr,
            0
        );

        if (!session_)
            return false;

        // =========================================
        // HTTPS CONNECTION
        // =========================================

        connect_ = WinHttpConnect(
            session_,
            host,
            INTERNET_DEFAULT_HTTPS_PORT,
            0
        );

        if (!connect_)
            return false;

        // =========================================
        // WEBSOCKET REQUEST
        // =========================================

        request_ = WinHttpOpenRequest(
            connect_,
            L"GET",
            path,
            nullptr,
            nullptr,
            nullptr,
            WINHTTP_FLAG_SECURE
        );

        if (!request_)
            return false;

        if (!WinHttpSetOption(
            request_,
            WINHTTP_OPTION_UPGRADE_TO_WEB_SOCKET,
            nullptr,
            0))
        {
            return false;
        }

        // =========================================
        // SEND REQUEST
        // =========================================

        if (!WinHttpSendRequest(
            request_,
            nullptr,
            0,
            nullptr,
            0,
            0,
            0))
        {
            return false;
        }

        // =========================================
        // RECEIVE RESPONSE
        // =========================================

        if (!WinHttpReceiveResponse(
            request_,
            nullptr))
        {
            return false;
        }

        // =========================================
        // UPGRADE TO WEBSOCKET
        // =========================================

        websocket_ =
            WinHttpWebSocketCompleteUpgrade(
                request_,
                0
            );

        if (!websocket_)
            return false;

        WinHttpCloseHandle(
            request_
        );

        request_ = nullptr;

        // =========================================
        // RECEIVE GENERATED GAME ID
        // =========================================

        std::string response;

        if (!receiveText(response))
            return false;

        // O relay deve responder:
        //
        // {
        //   "type": "game_created",
        //   "gameId": "..."
        // }

        if (response.find(
                "\"type\":\"game_created\"")
            == std::string::npos)
        {
            return false;
        }

        game_id_ =
            extractJsonString(
                response,
                "gameId"
            );

        if (game_id_.empty())
            return false;

        return true;
    }

    bool Send(
        const std::string& text)
    {
        if (!websocket_)
            return false;

        return
            WinHttpWebSocketSend(
                websocket_,
                WINHTTP_WEB_SOCKET_UTF8_MESSAGE_BUFFER_TYPE,
                reinterpret_cast<PVOID>(
                    const_cast<char*>(
                        text.data())),
                static_cast<DWORD>(
                    text.size())
            ) == NO_ERROR;
    }

    const std::string& GetGameId() const
    {
        return game_id_;
    }

    ~RelayClient()
    {
        if (websocket_)
        {
            WinHttpWebSocketClose(
                websocket_,
                WINHTTP_WEB_SOCKET_SUCCESS_CLOSE_STATUS,
                nullptr,
                0
            );

            WinHttpCloseHandle(
                websocket_
            );

            websocket_ = nullptr;
        }

        if (request_)
        {
            WinHttpCloseHandle(
                request_
            );

            request_ = nullptr;
        }

        if (connect_)
        {
            WinHttpCloseHandle(
                connect_
            );

            connect_ = nullptr;
        }

        if (session_)
        {
            WinHttpCloseHandle(
                session_
            );

            session_ = nullptr;
        }
    }
};
