import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Text,
  View,
  ImageBackground,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Modal from "react-native-modal";
import { createGame } from "hunting-words";
import randomcolor from "randomcolor";
import styles from "./style";
import { scale } from "react-native-size-matters";
import MoedasComponent from "../../../../../components/storage";
import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import NiveisPro from "../../../../../components/storageNivelPro";

import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { Audio } from "expo-av";

const { width, height } = Dimensions.get("screen");

const Cell = React.memo(
  ({ letter, selected, palavraParaCor, cores, wordsFound }) => {
    const color = palavraParaCor[letter.word] || cores[wordsFound];

    return (
      <View
        style={[
          styles.cell,
          letter.isSelected && [styles.selected, { backgroundColor: color }],
          selected && [styles.selected, { backgroundColor: color }],
        ]}
      >
        <Text style={styles.cellText}>{letter.letter}</Text>
      </View>
    );
  }
);

export default function PaisesPro({ navigation, rows = 12, cols = 12 }) {
  const { paises, addPaises } = NiveisPro();

  const [palavras, setPalavras] = useState([]);
  const [board, setBoard] = useState({
    game: new createGame(12, 12, []),
  });
  const [cores, setCores] = useState([]);
  const [startTime, setStartTime] = useState(new Date());
  const [isModalVisible, setModalVisible] = useState(false);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [numDicasUsadas, setNumDicasUsadas] = useState(0);
  const [hintsExhausted, setHintsExhausted] = useState(false);
  const [columns, setColumns] = useState([]);
  const { moedas, adicionarMoedas } = MoedasComponent();
  const [moedasGanhas, setMoedasGanhas] = useState(0);
  const [currentCell, setCurrentCell] = useState(null);
  const [initialCell, setInitialCell] = useState(null);
  const [state, setState] = useState({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    gestureType: null,
  });

  const [wordsFound, setWordsFound] = useState(0);
  const [palavraParaCor, setPalavraParaCor] = useState([]);
  const widthCell = (width * 0.85) / 12;
  const heightCell = (height * 0.6) / 12;

  const atualizarPalavraParaCor = useCallback((palavra, cor) => {
    setPalavraParaCor((prev) => ({
      ...prev,
      [palavra]: cor,
    }));
  }, []);

  const isMountedRef = useRef(true);

  const selectRandomWords = (totalWords, numWords) => {
    const selectedWords = [];
    const allWords = [...totalWords];

    while (selectedWords.length < numWords && allWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * allWords.length);
      selectedWords.push(allWords.splice(randomIndex, 1)[0]);
    }

    return selectedWords;
  };

  const mostrarDica = () => {
    if (numDicasUsadas < 5) {
      const palavrasNaoEncontradas = palavras.filter(
        (palavra) => !palavra.found
      );

      if (palavrasNaoEncontradas.length > 0) {
        const indiceAleatorio = Math.floor(
          Math.random() * palavrasNaoEncontradas.length
        );
        const palavraAleatoria = palavrasNaoEncontradas[indiceAleatorio];
        const novoTabuleiro = { ...board.game };
        const novasPalavras = [...palavras];

        // seleciona as letras correspondentes à palavra aleatória
        columns.forEach((column) => {
          if (column.word[0] === palavraAleatoria.name) {
            let row = column.row;
            let col = column.column;
            setCurrentCell({ row, col });
            novoTabuleiro.board[column.row][column.column].setIsSelected(true);
            if (!isCellSelected(row, col)) {
              setSelectedCells((prevCells) => [...prevCells, { row, col }]);
            }
          }
        });

        // muda o fundo da palavra encontrada
        novasPalavras.forEach((palavra) => {
          if (palavra.name === palavraAleatoria.name) {
            palavra.found = true;
            setWordsFound(wordsFound + 1);
            atualizarPalavraParaCor(palavraAleatoria.name, cores[wordsFound]);
          }
        });

        // atualiza a state de palavras apenas se houve alterações
        setBoard({ game: novoTabuleiro });
        setSelectedCells([]);
        setCurrentCell(null);
        setInitialCell(null);

        setPalavras([...novasPalavras]);
        userWin();
        setNumDicasUsadas(numDicasUsadas + 1);
      } else {
        setHintsExhausted(true);
      }
    } else {
      setHintsExhausted(true);
    }
  };

  const fecharModalDicasEsgotadas = () => {
    setHintsExhausted(false);
  };

  const buildColumnsArray = () => {
    const columnsArray = [];
    board.game.board.forEach((row) => {
      row.forEach((column) => {
        columnsArray.push(column);
      });
    });
    setColumns(columnsArray);
  };

  useEffect(() => {
    buildColumnsArray();
  }, [board.game]);

  const filterCellsByMovement = useCallback(
    (selectedCells) => {
      const n = selectedCells.length;

      if (n <= 2) {
        return selectedCells;
      }

      const firstCell = selectedCells[0];
      const lastCell = selectedCells[n - 1];

      const expectedSlope =
        (lastCell.row - firstCell.row) / (lastCell.col - firstCell.col);

      return selectedCells.filter((cell, index) => {
        if (index === 0 || index === n - 1) {
          return true;
        }

        const currentSlope =
          (cell.row - firstCell.row) / (cell.col - firstCell.col);
        return currentSlope === expectedSlope;
      });
    },
    [selectedCells]
  );

  const tapSound = useRef(new Audio.Sound());
  const magicSound = useRef(new Audio.Sound());

  useEffect(() => {
    loadMagicAudio();
    loadTapAudio();
  }, []);

  async function loadTapAudio() {
    const { soundMagic } = await tapSound.current.loadAsync(
      require("../../../../../assets/tap.mp3")
    );
  }

  async function loadMagicAudio() {
    const { soundTap } = await magicSound.current.loadAsync(
      require("../../../../../assets/magicSound.mp3")
    );
  }

  async function playSound() {
    await tapSound?.current?.playAsync();
    // const { sound } = await Audio.Sound.createAsync(
    //   require("../../../../../assets/tap.mp3")
    // );
    // setSound(sound);
  }

  async function replaySound() {
    await tapSound?.current?.replayAsync();
    // const { sound } = await Audio.Sound.createAsync(
    //   require("../../../../../assets/tap.mp3")
    // );
    // setSound(sound);
  }

  async function pauseSound() {
    await tapSound?.current?.pauseAsync();
    // const { sound } = await Audio.Sound.createAsync(
    //   require("../../../../../assets/tap.mp3")
    // );
    // setSound(sound);
  }

  async function playMagicSound() {
    await magicSound?.current?.playAsync();
  }

  async function replayMagicSound() {
    await magicSound?.current?.replayAsync();
  }

  const gesture = Gesture.Pan()
    .onStart(({ x, y }) => {
      const row = Math.floor(y / heightCell);
      const col = Math.floor(x / widthCell);

      playSound();

      if (!initialCell) {
        setInitialCell({ row, col });
      }
    })
    .onUpdate(({ x, y }) => {
      const row = Math.floor(y / heightCell);
      const col = Math.floor(x / widthCell);

      if (isAligned(initialCell, { row, col })) {
        if (!isCellSelected(row, col)) {
          replaySound();
          setSelectedCells((prevCells) => [...prevCells, { row, col }]);
          const filteredCells = filterCellsByMovement([
            ...selectedCells,
            { row, col },
          ]);

          setSelectedCells(filteredCells);
        }
      }
    })
    .onFinalize(() => {
      pauseSound();
      let letterSelected = "";
      selectedCells.forEach((cell) => {
        if (isAligned(initialCell, cell)) {
          board.game.board.forEach((row) => {
            row.forEach((letter) => {
              if (cell.col === letter.column && cell.row === letter.row) {
                if (!letter.isSelected) letterSelected += letter.letter;
              }
            });
          });
        }
      });

      let game = board.game;
      game.board.forEach((row) => {
        row.forEach((column) => {
          if (!column.isSelected) {
            if (column.word[0] === letterSelected) {
              game.board[column.row][column.column].setIsSelected(true);
            }
          }
        });
      });

      palavras.forEach((palavra) => {
        if (palavra.name === letterSelected) {
          palavra.found = true;
          replayMagicSound();
          setWordsFound(wordsFound + 1);
          atualizarPalavraParaCor(letterSelected, cores[wordsFound]);
        }
      });

      setBoard({ game });
      setSelectedCells([]);
      setCurrentCell(null);
      setInitialCell(null);

      setPalavras([...palavras]);
      userWin();
    })
    .shouldCancelWhenOutside(true);

  const fetchData = async () => {
    try {
      const palavrasOriginais = [
        { name: "CHINA", found: false },
        { name: "EGITO", found: false },
        { name: "CUBA", found: false },
        { name: "HOLDA", found: false },
        { name: "JAPAO", found: false },
        { name: "MEXICO", found: false },
        { name: "NEPAL", found: false },
        { name: "PERU", found: false },
        { name: "GANA", found: false },
        { name: "CUBA", found: false },
        { name: "IRAQ", found: false },
        { name: "IRA", found: false },
        { name: "LAOS", found: false },
        { name: "LIBIA", found: false },
        { name: "MALI", found: false },
        { name: "MALTA", found: false },
        { name: "OMA", found: false },
        { name: "TOGO", found: false },
        { name: "FIJI", found: false },
        { name: "Brasil", found: false },
        { name: "Itália", found: false },
        { name: "França", found: false },
        { name: "Rússia", found: false },
        { name: "Alemanha", found: false },
        { name: "Espanha", found: false },
        { name: "Canadá", found: false },
        { name: "Austrália", found: false },
        { name: "Argentina", found: false },
        { name: "Chile", found: false },
        { name: "Índia", found: false },
        { name: "Suíça", found: false },
        { name: "Suécia", found: false },
        { name: "Noruega", found: false },
        { name: "Polônia", found: false },
        { name: "Bélgica", found: false },
        { name: "Portugal", found: false },
        { name: "Holanda", found: false },
        { name: "China", found: false },
        { name: "Índia", found: false },
        { name: "Grécia", found: false },
        { name: "Israel", found: false },
        { name: "Dinamarca", found: false },
        { name: "Finlândia", found: false },
        { name: "Áustria", found: false },
        { name: "Egito", found: false },
        { name: "Peru", found: false },
        { name: "Colômbia", found: false },
        { name: "Venezuela", found: false },
        { name: "Panamá", found: false },
        { name: "Bolívia", found: false },
        { name: "Etiópia", found: false },
        { name: "Nigéria", found: false },
        { name: "Gana", found: false },
        { name: "Congo", found: false },
        { name: "Líbia", found: false },
        { name: "Sudão", found: false }
      ];

      if (isMountedRef.current) {
        const palavrasEscolhidas = selectRandomWords(palavrasOriginais, 9);
        setPalavras(palavrasEscolhidas);

        const palavrasJogo = palavrasEscolhidas.map((palavra) => palavra.name);
        setBoard({ game: new createGame(12, 12, palavrasJogo) });

        const coresAleatorias = palavrasEscolhidas.map(() => randomcolor());
        setCores(coresAleatorias);

        setStartTime(new Date());
        setModalVisible(false);
        setTempoDecorrido(0);
        setWordsFound(0);
        setPalavraParaCor([]);
      }
    } catch (error) {
      console.error("Erro ao buscar dados: ", error);
    }
  };

  useEffect(() => {
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function userWin() {
    const isWin = palavras.every((palavra) => palavra.found === true);

    if (isWin) {
      mostrarResultado();
    }
  }

  const mostrarResultado = () => {
    const endTime = new Date();
    const tempoDecorrido = (endTime - startTime) / 1000;

    const minutos = Math.floor(tempoDecorrido / 60);
    const segundos = Math.floor(tempoDecorrido % 60);

    const tempoFormatado = `${minutos} min ${segundos} seg`;

    let level = parseInt(paises) + 1;
    if (paises < 30) addPaises(level.toString());

    adicionarMoedas(86);
    setMoedasGanhas(86);

    setModalVisible(true);
    setTempoDecorrido(tempoFormatado);
  };

  const reiniciarJogo = () => {
    const palavrasOriginais = [
      { name: "CHINA", found: false },
        { name: "EGITO", found: false },
        { name: "CUBA", found: false },
        { name: "HOLDA", found: false },
        { name: "JAPAO", found: false },
        { name: "MEXICO", found: false },
        { name: "NEPAL", found: false },
        { name: "PERU", found: false },
        { name: "GANA", found: false },
        { name: "CUBA", found: false },
        { name: "IRAQ", found: false },
        { name: "IRA", found: false },
        { name: "LAOS", found: false },
        { name: "LIBIA", found: false },
        { name: "MALI", found: false },
        { name: "MALTA", found: false },
        { name: "OMA", found: false },
        { name: "TOGO", found: false },
        { name: "FIJI", found: false },
        { name: "Brasil", found: false },
        { name: "Itália", found: false },
        { name: "França", found: false },
        { name: "Rússia", found: false },
        { name: "Alemanha", found: false },
        { name: "Espanha", found: false },
        { name: "Canadá", found: false },
        { name: "Austrália", found: false },
        { name: "Argentina", found: false },
        { name: "Chile", found: false },
        { name: "Índia", found: false },
        { name: "Suíça", found: false },
        { name: "Suécia", found: false },
        { name: "Noruega", found: false },
        { name: "Polônia", found: false },
        { name: "Bélgica", found: false },
        { name: "Portugal", found: false },
        { name: "Holanda", found: false },
        { name: "China", found: false },
        { name: "Índia", found: false },
        { name: "Grécia", found: false },
        { name: "Israel", found: false },
        { name: "Dinamarca", found: false },
        { name: "Finlândia", found: false },
        { name: "Áustria", found: false },
        { name: "Egito", found: false },
        { name: "Peru", found: false },
        { name: "Colômbia", found: false },
        { name: "Venezuela", found: false },
        { name: "Panamá", found: false },
        { name: "Bolívia", found: false },
        { name: "Etiópia", found: false },
        { name: "Nigéria", found: false },
        { name: "Gana", found: false },
        { name: "Congo", found: false },
        { name: "Líbia", found: false },
        { name: "Sudão", found: false }
    ];

    const palavrasEscolhidas = selectRandomWords(palavrasOriginais, 9);
    setPalavras(palavrasEscolhidas);

    const palavrasJogo = palavrasEscolhidas.map((palavra) => palavra.name);
    setBoard({ game: new createGame(12, 12, palavrasJogo) });

    const coresAleatorias = palavrasEscolhidas.map(() => randomcolor());
    setCores(coresAleatorias);

    setStartTime(new Date());
    setModalVisible(false);
    setTempoDecorrido(0);
    setNumDicasUsadas(0);
    setHintsExhausted(false);
    setColumns([]);
    setCurrentCell(null);
    setSelectedCells([]);
    setWordsFound(0);
    setPalavraParaCor([]);
  };

  const closeModal = () => {
    reiniciarJogo();
  };

  const [selectedCells, setSelectedCells] = useState([]);
  const panRef = useRef(null);

  const isCellSelected = useCallback(
    (row, col) =>
      selectedCells.some((cell) => cell.row === row && cell.col === col),
    [selectedCells]
  );

  const onGestureEvent = (event) => {
    const { x, y } = event.nativeEvent;
    const row = Math.floor(y / scale(CELL_SIZE));
    const col = Math.floor(x / scale(CELL_SIZE));

    if (!initialCell) {
      setInitialCell({ row, col });
    }

    if (isAligned(initialCell, { row, col })) {
      setCurrentCell({ row, col });
      if (!isCellSelected(row, col)) {
        setSelectedCells((prevCells) => [...prevCells, { row, col }]);
      }
    }
  };

  const onHandlerStateChange = (event, item) => {
    let letterSelected = "";

    selectedCells.forEach((cell) => {
      if (isAligned(initialCell, cell)) {
        board.game.board.forEach((row) => {
          row.forEach((letter) => {
            if (cell.col === letter.column && cell.row === letter.row) {
              if (!letter.isSelected) letterSelected += letter.letter;
            }
          });
        });
      }
    });

    let game = board.game;
    game.board.forEach((row) => {
      row.forEach((column) => {
        if (!column.isSelected) {
          if (column.word[0] === letterSelected) {
            game.board[column.row][column.column].setIsSelected(true);
          }
        }
      });
    });

    palavras.forEach((palavra) => {
      if (palavra.name === letterSelected) {
        palavra.found = true;
      }
    });

    setBoard({ game });
    setSelectedCells([]);
    setCurrentCell(null);
    setInitialCell(null);

    setPalavras([...palavras]);
    userWin();
  };

  const isAligned = (cell1, cell2) => {
    if (!cell1 || !cell2) return false;

    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);

    return (
      rowDiff === colDiff || cell1.row === cell2.row || cell1.col === cell2.col
    );
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("./../../../../../assets/templatejogo.jpg")}
        style={styles.imageBackground}
      >
        <TouchableOpacity onPress={mostrarDica}>
          <View style={{ justifyContent: "center", alignItems: "center" }}>
            <ImageBackground
              source={require("./../../../../../assets/chapeu.png")}
              style={styles.Dica}
            >
              <Text style={styles.dicaNumber}>{5 - numDicasUsadas}</Text>
            </ImageBackground>
          </View>
        </TouchableOpacity>

        <View style={styles.moedasContainer}>
          <View style={styles.IconMoeda}></View>
          <Text style={styles.moedasText}>{moedas}</Text>
        </View>

        <Ionicons
          style={styles.button}
          name="arrow-back"
          size={scale(40)}
          color="white"
          onPress={() => navigation.navigate("NivelPro")}
        />

        <View style={styles.cacaContainer}>
          <View style={styles.retangulo}>
            <GestureDetector gesture={gesture}>
              <FlatList
                data={board.game.board}
                keyExtractor={(_, i) => i.toString()}
                scrollEnabled={false}
                renderItem={({ index, item }) => {
                  return (
                    <View style={[styles.row]}>
                      {item.map((letter, index) => (
                        <Cell
                          key={`cell-${letter.row}-${letter.column}`}
                          letter={letter}
                          selected={isCellSelected(letter.row, letter.column)}
                          palavraParaCor={palavraParaCor}
                          cores={cores}
                          wordsFound={wordsFound}
                        />
                      ))}
                    </View>
                  );
                }}
              />
            </GestureDetector>
          </View>
        </View>

        <View style={styles.palavrasContainer}>
          {palavras.map((palavra, index) => (
            <Text
              key={index}
              style={[styles.palavras, palavra.found ? [
                styles.wordFound,
                { backgroundColor: palavraParaCor[palavra.name] }
              ] : null]}
            >
              {palavra.name}
            </Text>
          ))}
        </View>

        <Modal
          isVisible={hintsExhausted}
          onBackdropPress={fecharModalDicasEsgotadas}
          style={styles.modalContainer2}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>As dicas acabaram!</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={fecharModalDicasEsgotadas}
            >
              <Text style={styles.modalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <Modal
          isVisible={isModalVisible}
          onBackdropPress={closeModal}
          style={styles.modalContainer2}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalVoltarHome}
              onPress={() => navigation.navigate("Home")}
            >
              <Text style={styles.modalButtonText}>Voltar</Text>
            </TouchableOpacity>
            <View style={styles.modalGanhos}>
              <View>
                <Text style={styles.modalText}>TEMPO:</Text>
                <Text style={styles.textTempo}>{tempoDecorrido}</Text>
              </View>
              <View>
                <Text style={styles.modalText}>MOEDAS:</Text>
                <Text style={styles.textMoeda}>+{moedasGanhas}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
              <Text style={styles.modalButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <StatusBar style="auto" />
      </ImageBackground>
    </View>
  );
}
