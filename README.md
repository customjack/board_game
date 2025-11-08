# Drinking Board Game

A web-based multiplayer drinking board game built with JavaScript, Webpack, and PeerJS. This game allows players to host and join custom board games with friends, leveraging peer-to-peer connections for a seamless multiplayer experience.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Built With](#built-with)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

- Host and join multiplayer games without the need for a centralized server.
- Real-time communication using PeerJS (WebRTC).
- Customizable game boards and rules.
- Interactive UI built with HTML, CSS, and JavaScript.
- Modular code structure for scalability and maintainability.


## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- **Node.js** (version 19 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/customjack/drinking_board_game.git
   cd drinking_board_game
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure local PeerJS server (recommended for development)**

   ```bash
   cp .env.example .env
   ```

   The `.env` file is pre-configured for local development. No changes needed!

### Running the Application

#### Development Mode (Recommended)

For the best development experience with fast local connections:

**Option 1: Full local setup (recommended)**
```bash
# In terminal 1: Start local PeerJS server
npm run peerjs:start

# In terminal 2: Start webpack dev server
npm start
```

**Option 2: One command (combined)**
```bash
npm run dev:full
```

Open your browser and navigate to `http://localhost:9000`.

You should see: `[NetworkConfig] Using custom PeerJS server: localhost` in the console.

**Option 3: Without local PeerJS server**
```bash
npm start
```

This uses the default PeerJS cloud server (may be slower or unavailable).

#### Production Build

To build the application for production:

```bash
npm run build
```

The optimized files will be in the `dist/` directory.

## Built With

- [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) - Programming language.
- [Node.js](https://nodejs.org/) - JavaScript runtime environment.
- [Webpack](https://webpack.js.org/) - Module bundler.
- [PeerJS](https://peerjs.com/) - Simplifies WebRTC peer-to-peer data, video, and audio calls.
- [Babel](https://babeljs.io/) - JavaScript compiler.
- [HTML5](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5) - Markup language.
- [CSS3](https://developer.mozilla.org/en-US/docs/Web/CSS) - Stylesheet language.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**

   Click the "Fork" button at the top right of the repository page.

2. **Create your feature branch**

   ```bash
   git checkout -b feature/YourFeature
   ```

3. **Commit your changes**

   ```bash
   git commit -am 'Add some feature'
   ```

4. **Push to the branch**

   ```bash
   git push origin feature/YourFeature
   ```

5. **Open a pull request**

   Go to your forked repository on GitHub and click the "New pull request" button.

Please ensure your code follows the project's coding standards and passes all tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **ChatGPT by OpenAI**: The project was largely written with the assistance of ChatGPT, an AI language model developed by OpenAI.
- **Jack (customjack)**: Reviewed, refined, and maintained the project.

---