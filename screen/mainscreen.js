import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const MainScreen = () => {
  // Game state
  const [gameState, setGameState] = useState('menu');
  const [boardSize, setBoardSize] = useState(3);
  const [playerX, setPlayerX] = useState('Player X');
  const [playerO, setPlayerO] = useState('Player O');
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [board, setBoard] = useState(Array(9).fill(null));
  const [winner, setWinner] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [score, setScore] = useState({ X: 0, O: 0, draws: 0 });
  const [gameHistory, setGameHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [cellAnimations] = useState(() => 
    Array(25).fill(null).map(() => new Animated.Value(0))
  );

  // Background images
  const backgrounds = {
    menu: require('../assets/images/game-bg.jpg'),
    game: require('../assets/images/board-bg.jpg'),
  };

    const [soundObjects, setSoundObjects] = useState({
    click: null,
    win: null,
    draw: null,
  });

  // Load sounds when component mounts
  useEffect(() => {
    const loadSounds = async () => {
      try {
        const { sound: clickSound } = await Audio.Sound.createAsync(
          require('../assets/sounds/click.wav')
        );
        const { sound: winSound } = await Audio.Sound.createAsync(
          require('../assets/sounds/win.wav')
        );
        const { sound: drawSound } = await Audio.Sound.createAsync(
          require('../assets/sounds/draw.wav')
        );
        
        setSoundObjects({
          click: clickSound,
          win: winSound,
          draw: drawSound,
        });
      } catch (error) {
        console.error('Failed to load sounds', error);
      }
    };

    loadSounds();
      // Cleanup on unmount
    return () => {
      Object.values(soundObjects).forEach(sound => {
        if (sound) sound.unloadAsync();
      });
    };
  }, []);


   // Play sound function
  const playSound = async (type) => {
    try {
      const sound = soundObjects[type];
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing sound', error);
    }
  };

  // Initialize animations
  useEffect(() => {
    if (gameState === 'playing') {
      cellAnimations.forEach(anim => anim.setValue(0));
    }
  }, [gameState]);

  const animateCell = (index) => {
    cellAnimations[index].setValue(0);
    Animated.spring(cellAnimations[index], {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // Initialize board
  const initBoard = (size) => {
    setBoard(Array(size * size).fill(null));
    setBoardSize(size);
    setWinner(null);
    setCurrentPlayer('X');
  };

  // Handle cell press
  const handleCellPress = (index) => {
    if (board[index] || winner) return;

    animateCell(index);
    playSound('click');
    
    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    checkWinner(newBoard);
    setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
  };

  // Check for winner
  const checkWinner = (currentBoard) => {
    const lines = [];
    
    // Generate winning lines
    for (let i = 0; i < boardSize; i++) {
      // Rows
      const row = [];
      for (let j = 0; j < boardSize; j++) {
        row.push(i * boardSize + j);
      }
      lines.push(row);
      
      // Columns
      const col = [];
      for (let j = 0; j < boardSize; j++) {
        col.push(j * boardSize + i);
      }
      lines.push(col);
    }
    
    // Diagonals
    const diag1 = [];
    const diag2 = [];
    for (let i = 0; i < boardSize; i++) {
      diag1.push(i * boardSize + i);
      diag2.push(i * boardSize + (boardSize - 1 - i));
    }
    lines.push(diag1, diag2);

    // Check all lines
    for (let line of lines) {
      const first = currentBoard[line[0]];
      if (first && line.every(index => currentBoard[index] === first)) {
        playSound('win');
        setWinner(first);
        setScore(prev => ({
          ...prev,
          [first]: prev[first] + 1
        }));
        setGameHistory(prev => [
          ...prev,
          { winner: first, boardSize, players: { X: playerX, O: playerO }, date: new Date() }
        ]);
        return;
      }
    }

    // Check for draw
    if (!currentBoard.includes(null)) {
      playSound('draw');
      setWinner('draw');
      setScore(prev => ({
        ...prev,
        draws: prev.draws + 1
      }));
      setGameHistory(prev => [
        ...prev,
        { winner: 'draw', boardSize, players: { X: playerX, O: playerO }, date: new Date() }
      ]);
    }
  };

  // Reset game
  const resetGame = () => {
    initBoard(boardSize);
  };

  // Render animated cell
  const renderCell = (index) => {
    const scale = cellAnimations[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1]
    });

    return (
      <Animated.View style={[styles.cellContainer, { transform: [{ scale }] }]}>
        <TouchableOpacity
          style={styles.cell}
          onPress={() => handleCellPress(index)}
          activeOpacity={0.7}
        >
          {board[index] && (
            <Text style={[
              styles.cellText, 
              board[index] === 'X' ? styles.xText : styles.oText,
              styles.cellSymbol
            ]}>
              {board[index]}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render board
  const renderBoard = () => {
    return (
      <View style={styles.boardContainer}>
        <View style={styles.board}>
          {Array(boardSize).fill(null).map((_, row) => (
            <View key={row} style={styles.row}>
              {Array(boardSize).fill(null).map((_, col) => (
                renderCell(row * boardSize + col)
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Start game setup
  const startGameSetup = () => {
    setGameState('setup');
  };

  // Start game with selected options
  const startGame = () => {
    initBoard(boardSize);
    setGameState('playing');
  };

  // Main menu
  if (gameState === 'menu') {
    return (
      <ImageBackground source={backgrounds.menu} style={styles.container} resizeMode="cover">
        <View style={styles.overlay} />
        
        <View style={styles.content}>
          <Text style={styles.title}>TIC TAC TOE</Text>
          
          <View style={styles.menuButtons}>
            <TouchableOpacity 
              style={[styles.menuButton, styles.playButton]}
              onPress={startGameSetup}
            >
              <Text style={styles.menuButtonText}>PLAY</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuButton, styles.howToPlayButton]}
              onPress={() => setShowHowToPlay(true)}
            >
              <Text style={styles.menuButtonText}>HOW TO PLAY</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuButton, styles.historyButton]}
              onPress={() => setShowHistory(true)}
            >
              <Text style={styles.menuButtonText}>GAME HISTORY</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How to Play Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showHowToPlay}
          onRequestClose={() => setShowHowToPlay(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>HOW TO PLAY</Text>
              <View style={styles.rulesContainer}>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>1</Text>
                  <Text style={styles.ruleText}>Players alternate placing X and O marks</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>2</Text>
                  <Text style={styles.ruleText}>First to get {boardSize} in a row wins</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>3</Text>
                  <Text style={styles.ruleText}>Row can be horizontal, vertical, or diagonal</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>4</Text>
                  <Text style={styles.ruleText}>Game ends in draw when board is full</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowHowToPlay(false)}
              >
                <Text style={styles.modalButtonText}>GOT IT!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* History Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showHistory}
          onRequestClose={() => setShowHistory(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, styles.historyModal]}>
              <Text style={styles.modalTitle}>GAME HISTORY</Text>
              
              {gameHistory.length > 0 ? (
                <View style={styles.historyList}>
                  {gameHistory.slice().reverse().map((game, index) => (
                    <View key={index} style={styles.historyItem}>
                      <Text style={styles.historyText}>
                        {game.winner === 'draw' ? 'Draw' : `${game.players[game.winner]} won`}
                      </Text>
                      <Text style={styles.historySubtext}>
                        {game.boardSize}x{game.boardSize} • {game.date.toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noHistoryText}>No games played yet</Text>
              )}
              
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowHistory(false)}
              >
                <Text style={styles.modalButtonText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    );
  }

  // Game setup
  if (gameState === 'setup') {
    return (
      <ImageBackground source={backgrounds.menu} style={styles.container} resizeMode="cover">
        <View style={styles.overlay} />
        
        <View style={styles.content}>
          <Text style={styles.title}>GAME SETUP</Text>
          
          <View style={styles.setupContainer}>
            <Text style={styles.setupSectionTitle}>BOARD SIZE</Text>
            <View style={styles.sizeOptions}>
              {[3, 4, 5].map(size => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeOption,
                    boardSize === size && styles.sizeOptionSelected
                  ]}
                  onPress={() => setBoardSize(size)}
                >
                  <Text style={[
                    styles.sizeOptionText,
                    boardSize === size && styles.sizeOptionTextSelected
                  ]}>
                    {size}x{size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.setupSectionTitle}>PLAYER NAMES</Text>
            <View style={styles.playerInputContainer}>
              <Text style={styles.playerLabel}>X</Text>
              <TextInput
                style={styles.playerInput}
                value={playerX}
                onChangeText={setPlayerX}
                placeholder="Enter name"
                placeholderTextColor="#aaa"
              />
            </View>
            <View style={styles.playerInputContainer}>
              <Text style={styles.playerLabel}>O</Text>
              <TextInput
                style={styles.playerInput}
                value={playerO}
                onChangeText={setPlayerO}
                placeholder="Enter name"
                placeholderTextColor="#aaa"
              />
            </View>
          </View>
          
          <View style={styles.setupButtons}>
            <TouchableOpacity 
              style={[styles.setupButton, styles.startButton]}
              onPress={startGame}
            >
              <Text style={styles.setupButtonText}>START GAME</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.setupButton, styles.backButton]}
              onPress={() => setGameState('menu')}
            >
              <Text style={styles.setupButtonText}>BACK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  // Game screen
  return (
    <ImageBackground source={backgrounds.game} style={styles.container} resizeMode="cover">
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        <View style={styles.gameHeader}>
          <TouchableOpacity 
            style={styles.backButtonSmall}
            onPress={() => setGameState('menu')}
          >
            <Text style={styles.backButtonText}>← MENU</Text>
          </TouchableOpacity>
          
          <Text style={styles.gameTitle}>{boardSize}x{boardSize} TIC TAC TOE</Text>
        </View>
        
        <View style={styles.scoreBoard}>
          <View style={[styles.scoreItem, currentPlayer === 'X' && styles.scoreItemActive]}>
            <Text style={styles.scoreLabel}>PLAYER X</Text>
            <Text style={styles.scorePlayer}>{playerX}</Text>
            <Text style={styles.scoreValue}>{score.X}</Text>
          </View>
          
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>DRAWS</Text>
            <Text style={styles.scoreValue}>{score.draws}</Text>
          </View>
          
          <View style={[styles.scoreItem, currentPlayer === 'O' && styles.scoreItemActive]}>
            <Text style={styles.scoreLabel}>PLAYER O</Text>
            <Text style={styles.scorePlayer}>{playerO}</Text>
            <Text style={styles.scoreValue}>{score.O}</Text>
          </View>
        </View>
        
        <Text style={styles.turnIndicator}>
          {currentPlayer === 'X' ? playerX : playerO}'S TURN
        </Text>
        
        {renderBoard()}
        
        {winner && (
          <View style={styles.resultModal}>
            <View style={styles.resultContent}>
              <Text style={styles.resultTitle}>
                {winner === 'draw' ? "IT'S A DRAW!" : `${winner === 'X' ? playerX : playerO} WINS!`}
              </Text>
              
              <View style={styles.resultButtons}>
                <TouchableOpacity 
                  style={[styles.resultButton, styles.playAgainButton]}
                  onPress={resetGame}
                >
                  <Text style={styles.resultButtonText}>PLAY AGAIN</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.resultButton, styles.menuButton]}
                  onPress={() => setGameState('menu')}
                >
                  <Text style={styles.resultButtonText}>MAIN MENU</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </ImageBackground>
  );
};

const windowWidth = Dimensions.get('window').width;
const cellSize = windowWidth * 0.18;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  menuButtons: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 30,
  },
  menuButton: {
    width: '80%',
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    marginBottom: 10,
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  howToPlayButton: {
    backgroundColor: '#2196F3',
  },
  historyButton: {
    backgroundColor: '#FF9800',
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#2c3e50',
    padding: 25,
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
  },
  historyModal: {
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  rulesContainer: {
    marginBottom: 25,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  ruleNumber: {
    backgroundColor: '#3498db',
    color: '#fff',
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: 'bold',
    marginRight: 15,
  },
  ruleText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  modalButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  setupContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  setupSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
  },
  sizeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sizeOption: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 10,
    width: '30%',
    alignItems: 'center',
  },
  sizeOptionSelected: {
    backgroundColor: '#4CAF50',
  },
  sizeOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  sizeOptionTextSelected: {
    fontWeight: 'bold',
  },
  playerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingLeft: 15,
  },
  playerLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    width: 30,
  },
  playerInput: {
    flex: 1,
    color: '#fff',
    height: 50,
    paddingHorizontal: 15,
  },
  setupButtons: {
    width: '100%',
  },
  setupButton: {
    width: '100%',
    padding: 16,
    borderRadius: 30,
    marginBottom: 15,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonSmall: {
    marginRight: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  gameTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  scoreBoard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    padding: 10,
  },
  scoreItem: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scoreItemActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    borderColor: '#fff',
  },
  scoreLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scorePlayer: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  turnIndicator: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  boardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  board: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
  },
  cellContainer: {
    margin: 3,
  },
  cell: {
    width: cellSize,
    height: cellSize,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  cellText: {
    fontSize: cellSize * 0.6,
    fontWeight: 'bold',
  },
  xText: {
    color: '#e74c3c',
  },
  oText: {
    color: '#3498db',
  },
  resultModal: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  resultContent: {
    backgroundColor: '#2c3e50',
    padding: 30,
    borderRadius: 15,
    width: '90%',
    maxWidth: 350,
    alignItems: 'center',
  },
  resultTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  resultButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  resultButton: {
    padding: 15,
    borderRadius: 25,
    width: '48%',
    alignItems: 'center',
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
  },
  menuButton: {
    backgroundColor: '#e74c3c',
  },
  resultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyList: {
    maxHeight: '60%',
    marginBottom: 20,
  },
  historyItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  historyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historySubtext: {
    color: '#ecf0f1',
    fontSize: 12,
    marginTop: 5,
  },
  noHistoryText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default MainScreen;