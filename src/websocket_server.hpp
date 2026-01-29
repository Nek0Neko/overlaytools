#pragma once

#include "common.hpp"

#include <array>
#include <vector>
#include <string>
#include <cstdint>
#include <memory>
#include <queue>
#include <utility>
#include <tuple>

namespace app {

	constexpr UINT WS_TCP_RECV = 1001;
	constexpr UINT WS_TCP_SEND = 1002;

	// Security constants
	namespace ws_security {
		constexpr size_t MAX_MESSAGE_SIZE = 1024 * 1024;  // 1MB max message size
		constexpr size_t MAX_CONNECTIONS_PER_IP = 10;     // Max connections per IP
		constexpr uint64_t CONNECTION_TIMEOUT_MS = 30000; // 30 second connection timeout
		constexpr uint64_t RATE_LIMIT_WINDOW_MS = 1000;   // 1 second rate limit window
		constexpr size_t MAX_MESSAGES_PER_WINDOW = 100;   // Max messages per window
	}

	struct WS_ACCEPT_CONTEXT {
		WSAOVERLAPPED ov;
		SOCKET sock;
		char* data;
	};

	struct WS_IO_CONTEXT {
		WSAOVERLAPPED ov;
		SOCKET sock;
		WSABUF buf;
		UINT type;
		std::vector<uint8_t> rbuf;
		std::shared_ptr<std::vector<uint8_t>> wbuf;
	};

	std::wstring get_remote_ipport(LPVOID _buffer, DWORD _len);

	class wspacket {
	private:
		size_t header_readed;
		size_t mask_index;
		uint64_t len;
		uint64_t exlen;
		bool mask;
		std::array<uint8_t, 4> masking_key;

	public:
		bool fin;
		bool rsv1;
		bool rsv2;
		bool rsv3;
		uint16_t opcode;
		std::unique_ptr<std::vector<uint8_t>> data;

		wspacket();
		~wspacket();

		bool parse(const std::vector<uint8_t>& in, size_t inlen, size_t offset, size_t& remain) noexcept;
		uint64_t header_length() const noexcept;
		uint64_t payload_length() const noexcept;
		bool filled() const noexcept;
	};


	// handshake
	//   0: none
	//   1: handshaked
	struct wsconn_t {
		SOCKET sock;
		bool handshake;
		std::unique_ptr<wspacket> packet;
		std::unique_ptr<std::vector<uint8_t>> buffer;
		WS_IO_CONTEXT ior_ctx;
		WS_IO_CONTEXT iow_ctx;
		std::queue<std::shared_ptr<std::vector<uint8_t>>> wq;
		
		// Security: Rate limiting
		uint64_t last_message_time;
		size_t message_count;
		uint64_t connection_time;
		std::wstring remote_ip;
		
		wsconn_t() : sock(INVALID_SOCKET), handshake(false), packet(nullptr), buffer(nullptr),
		             last_message_time(0), message_count(0), connection_time(0) {};
		
		// Check if message rate limit exceeded
		bool check_rate_limit(uint64_t current_time) {
			if (current_time - last_message_time > ws_security::RATE_LIMIT_WINDOW_MS) {
				last_message_time = current_time;
				message_count = 1;
				return true;
			}
			message_count++;
			return message_count <= ws_security::MAX_MESSAGES_PER_WINDOW;
		}
	};

	class websocket_server {
	private:
		std::string listen_address;
		uint16_t listen_port;
		char addr_buffer[1024];
		WS_ACCEPT_CONTEXT accept_ctx;
		DWORD logid_;


		bool socket();
		bool bind();

		bool listen();

		void broadcast(std::shared_ptr<std::vector<uint8_t>>&_data);
		bool response(wsconn_t& wsconn, const std::vector<uint8_t>& data, int len);
		void pong(wsconn_t& wsconn, const uint8_t* data, int len);

	public:
		SOCKET sock;
		std::vector<wsconn_t> wsconns;

		websocket_server(const std::string _address, uint16_t _port, uint16_t _maxconn, DWORD _logid);
		~websocket_server();

		size_t count() const noexcept;
		bool contains(SOCKET _sock) const noexcept;

		bool acceptex();
		bool send(SOCKET _sock, std::shared_ptr<std::vector<uint8_t>>& _data);
		bool read(SOCKET _sock);

		bool prepare();
		bool insert(SOCKET _sock);
		void close(SOCKET _sock);

		void send_binary(SOCKET _sock, const std::vector<uint8_t>& _data, size_t _len);
		void broadcast_binary(const std::vector<uint8_t>& _data, size_t _len);
		void broadcast_ping();

		std::queue<std::unique_ptr<std::vector<uint8_t>>> receive_data(SOCKET _sock, const std::vector<uint8_t>& data, int len);
	};
}
