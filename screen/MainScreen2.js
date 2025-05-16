import { Audio } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GameEngine } from 'react-native-game-engine';

const { width: WIDTH, height: HEIGHT } = Dimensions.get('window');
const BIRD_WIDTH = 40;
const BIRD_HEIGHT = 30;
const PIPE_WIDTH = 70;
const GAP_SIZE = 150;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 1500; // milliseconds

export default function MainScreen2() {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const gameEngine = useRef(null);
  const soundObject = useRef(null);

  // Lock screen orientation to portrait
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    
    // Load sound
    const loadSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/tap_ball.wav')
      );
      soundObject.current = sound;
    };
    
    loadSound();
    
    return () => {
      if (soundObject.current) {
        soundObject.current.unloadAsync();
      }
    };
  }, []);

  // Game entities
  const [entities, setEntities] = useState({
    bird: {
      position: { x: 100, y: HEIGHT / 2 - BIRD_HEIGHT / 2 },
      size: { width: BIRD_WIDTH, height: BIRD_HEIGHT },
      velocity: 0,
      renderer: <View style={styles.bird} />
    },
    pipes: [],
    score: {
      value: 0,
      renderer: <Text style={styles.scoreText}>{score}</Text>
    }
  });

  // Physics system
  const physics = (entities, { time }) => {
    if (!running) return entities;

    let { bird, pipes } = entities;
    let newPipes = [...pipes];
    
    // Apply gravity to bird
    bird.velocity += GRAVITY;
    bird.position.y += bird.velocity;

    // Check for collisions with ground or ceiling
    if (bird.position.y >= HEIGHT - BIRD_HEIGHT || bird.position.y <= 0) {
      gameOverHandler();
    }

    // Move pipes and check for collisions
    for (let i = 0; i < newPipes.length; i++) {
      newPipes[i].position.x -= PIPE_SPEED;

      // Check if bird passed through a pipe
      if (
        newPipes[i].position.x + PIPE_WIDTH < bird.position.x && 
        !newPipes[i].scored
      ) {
        newPipes[i].scored = true;
        setScore(prev => prev + 1);
      }

      // Check for collision with pipe
      if (
        bird.position.x + BIRD_WIDTH > newPipes[i].position.x &&
        bird.position.x < newPipes[i].position.x + PIPE_WIDTH &&
        (bird.position.y < newPipes[i].position.y || 
         bird.position.y + BIRD_HEIGHT > newPipes[i].position.y + GAP_SIZE)
      ) {
        gameOverHandler();
      }

      // Remove pipes that are off screen
      if (newPipes[i].position.x < -PIPE_WIDTH) {
        newPipes.splice(i, 1);
        i--;
      }
    }

    return { ...entities, bird, pipes: newPipes };
  };

  // Pipe spawning system
  const pipeSpawning = (entities, { events, dispatch }) => {
    if (!running) return entities;

    if (events.length) {
      events.forEach(e => {
        if (e.type === 'spawn-pipe') {
          const topPipeHeight = Math.random() * (HEIGHT - GAP_SIZE - 100) + 50;
          
          entities.pipes.push({
            position: { x: WIDTH, y: topPipeHeight - HEIGHT },
            size: { width: PIPE_WIDTH, height: HEIGHT },
            renderer: <View style={[styles.pipe, styles.topPipe, { height: HEIGHT }]} />
          });

          entities.pipes.push({
            position: { x: WIDTH, y: topPipeHeight + GAP_SIZE },
            size: { width: PIPE_WIDTH, height: HEIGHT },
            renderer: <View style={[styles.pipe, styles.bottomPipe, { height: HEIGHT }]} />
          });
        }
      });
    }

    return entities;
  };

  // Jump handler
  const jump = async () => {
    if (!running && !gameOver) {
      startGame();
      return;
    }

    if (gameOver) {
      resetGame();
      return;
    }

    if (soundObject.current) {
      try {
        await soundObject.current.replayAsync();
      } catch (error) {
        console.log('Sound error:', error);
      }
    }

    entities.bird.velocity = JUMP_FORCE;
  };

  // Start game
  const startGame = () => {
    setRunning(true);
    setGameOver(false);
    setScore(0);
    setEntities({
      bird: {
        position: { x: 100, y: HEIGHT / 2 - BIRD_HEIGHT / 2 },
        size: { width: BIRD_WIDTH, height: BIRD_HEIGHT },
        velocity: 0,
        renderer: <View style={styles.bird} />
      },
      pipes: [],
      score: {
        value: 0,
        renderer: <Text style={styles.scoreText}>{score}</Text>
      }
    });
  };

  // Game over handler
  const gameOverHandler = () => {
    setRunning(false);
    setGameOver(true);
    if (score > highScore) {
      setHighScore(score);
    }
  };

  // Reset game
  const resetGame = () => {
    startGame();
  };

  return (
    <ImageBackground 
      source={require('../assets/images/ball-bg.jpg')} 
      style={styles.container}
      resizeMode="cover"
    >
      <GameEngine
        ref={gameEngine}
        systems={[physics, pipeSpawning]}
        entities={entities}
        running={running}
        onEvent={(e) => {
          if (e.type === 'game-over') {
            gameOverHandler();
          }
        }}
      >
        <Text style={styles.scoreText}>{score}</Text>
        {!running && (
          <View style={styles.overlay}>
            {gameOver ? (
              <>
                <Text style={styles.gameOverText}>GAME OVER</Text>
                <Text style={styles.scoreDisplay}>Score: {score}</Text>
                <Text style={styles.highScore}>High Score: {highScore}</Text>
                <TouchableOpacity 
                  style={styles.startButton}
                  onPress={resetGame}
                >
                  <Text style={styles.buttonText}>PLAY AGAIN</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>FLAPPY BIRD</Text>
                <TouchableOpacity 
                  style={styles.startButton}
                  onPress={startGame}
                >
                  <Text style={styles.buttonText}>START GAME</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </GameEngine>

      <TouchableOpacity 
        style={styles.fullScreenButton}
        onPress={jump}
        activeOpacity={1}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'skyblue',
  },
  bird: {
    position: 'absolute',
    width: BIRD_WIDTH,
    height: BIRD_HEIGHT,
    backgroundColor: 'yellow',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'orange'
  },
  pipe: {
    position: 'absolute',
    width: PIPE_WIDTH,
    backgroundColor: 'green',
    borderWidth: 2,
    borderColor: 'darkgreen'
  },
  topPipe: {
    top: 0,
  },
  bottomPipe: {
    bottom: 0,
  },
  scoreText: {
    position: 'absolute',
    top: 50,
    width: '100%',
    textAlign: 'center',
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  title: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 40,
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  gameOverText: {
    color: 'red',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  scoreDisplay: {
    color: 'white',
    fontSize: 30,
    marginBottom: 10,
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  highScore: {
    color: 'gold',
    fontSize: 24,
    marginBottom: 40,
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'white'
  },
  buttonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  fullScreenButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  }
});