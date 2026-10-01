#include "pch.hpp"
#include "relay_client.h"

bool main()
{
    config_data_t config_data = {};

    INIT_STEP("config system", cfg::setup(config_data));
    INIT_STEP("memory", m_memory->setup());
    INIT_STEP("interfaces", i::setup());
    INIT_STEP("schema", schema::setup());

    LOG_INFO("initialization completed");

    RelayClient relay;

    // ============================================
    // RELAY
    // ============================================
    //
    // Troque pelo domínio REAL do seu Render.
    //
    // Exemplo:
    // radar-dgmk.onrender.com
    //
    // O servidor vai gerar o Game ID automaticamente.
    //

    if (!relay.Connect(
        L"radar-dgmk.onrender.com",
        L"/?role=host"))
    {
        LOG_ERROR("failed to connect to relay");

        std::this_thread::sleep_for(
            std::chrono::seconds(5)
        );

        return {};
    }

    // ============================================
    // GAME ID
    // ============================================

    LOG_INFO(
        "connected to relay"
    );

    LOG_INFO(
        "GAME ID: %s",
        relay.GetGameId().c_str()
    );

    LOG_INFO(
        "RADAR URL: https://radar-593.pages.dev/?game=%s",
        relay.GetGameId().c_str()
    );

    // ============================================
    // RADAR LOOP
    // ============================================

    for (;;)
    {
        sdk::update();

        f::run();

        relay.Send(
            f::m_data.dump()
        );

        std::this_thread::sleep_for(
            std::chrono::milliseconds(100)
        );
    }

    return true;
}
