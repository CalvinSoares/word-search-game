import React, { useState, useEffect, useRef } from 'react';
import { Text, View, ImageBackground, Image, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Modal from 'react-native-modal';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import styles from './style';
import { createGame } from 'hunting-words';
import randomcolor from 'randomcolor';
import { moderateScale, verticalScale, scale } from 'react-native-size-matters';


const DIRECTIONS = [
  [1, 0],     // horizontal direita
  [1, 1],     // diagonal inferior direita
  [0, 1],     // vertical para baixo
  [-1, 1],    // diagonal inferior esquerda
  [-1, 0],    // horizontal esquerda
  [-1, -1],   // diagonal superior esquerda
  [0, -1],    // vertical para cima
  [1, -1],    // diagonal superior direita
];

export default function PersonagensPro({ navigation }) {

  const [palavras, setPalavras] = useState([]);
  const [board, setBoard] = useState({
    game: new createGame(10, 10, []),
  });
  const [cores, setCores] = useState([]);
  const [startTime, setStartTime] = useState(new Date());
  const [isModalVisible, setModalVisible] = useState(false);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [isDicaModalVisible, setDicaModalVisible] = useState(false);
  const [dicaPalavra, setDicaPalavra] = useState('');

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

  const mostrarDicaModal = () => {
    setDicaModalVisible(true);
  };

  const fecharDicaModal = () => {
    setDicaModalVisible(false);
  };

  const revelarPalavraDica = () => {
    const palavrasNaoEncontradas = palavras.filter((palavra) => !palavra.found);

    if (palavrasNaoEncontradas.length > 0) {
      const palavraAleatoria = palavrasNaoEncontradas[Math.floor(Math.random() * palavrasNaoEncontradas.length)];

      // Marcar a palavra como encontrada
      palavraAleatoria.found = true;
      setPalavras([...palavras]);

      // Destacar a palavra no tabuleiro
      const palavraNoTabuleiro = palavraAleatoria.name;
      destacarPalavraNoTabuleiro(palavraNoTabuleiro);
    }

    // Fechar o modal de dica
    fecharDicaModal();
  };

  const destacarPalavraNoTabuleiro = (palavra) => {
    const novoTabuleiro = { ...board.game };

    // Percorrer o tabuleiro e destacar as letras da palavra
    novoTabuleiro.board.forEach((row) => {
      row.forEach((cell) => {
        if (palavra.includes(cell.letter)) {
          cell.isSelected = true; // Marcar como selecionada
        } else {
          cell.isSelected = false; // Deselecionar as letras que não fazem parte da palavra
        }
      });
    });

    setBoard({ game: novoTabuleiro });
  };

  const verificarPalavraSelecionada = () => {
    const novoTabuleiro = { ...board.game };
    const novasPalavras = [...palavras];
  
    novasPalavras.forEach((palavra) => {
      const palavraNoTabuleiro = palavra.name;
      const letrasSelecionadas = [];
  
      // Verificar quais letras estão selecionadas para a palavra atual
      novoTabuleiro.board.forEach((row) => {
        row.forEach((cell) => {
          if (palavraNoTabuleiro.includes(cell.letter) && cell.isSelected) {
            letrasSelecionadas.push(cell.letter);
          }
        });
      });
  
      // Verificar se as letras selecionadas formam a palavra completa
      const palavraCompleta = letrasSelecionadas.join('') === palavraNoTabuleiro;
  
      // Deselecionar as letras que não formam a palavra completa
      
      
    });
  
    setPalavras(novasPalavras);
    setBoard({ game: novoTabuleiro });
  };

  

  const fetchData = async () => {
    try {
      const palavrasOriginais = [
        { name: 'PAPAI', found: false },
        { name: 'MAMAE', found: false },
        { name: 'ANJO', found: false },
        { name: 'NEVE', found: false },
        { name: 'TRENÓ', found: false },
        { name: 'TOY', found: false },
        { name: 'GINGER', found: false },
        { name: 'SINOS', found: false },
        { name: 'ARVORE', found: false },
        { name: 'PENGU', found: false },
        { name: 'GRIFF', found: false },
        { name: 'CAMEL', found: false },
        { name: 'SANTA', found: false },
        { name: 'BELLS', found: false },
        { name: 'BOW', found: false },
        { name: 'CAROL', found: false },
        { name: 'CHIMNEY', found: false },
        { name: 'CUPIDO', found: false },
      ];

    if (isMountedRef.current) {
      const palavrasEscolhidas = selectRandomWords(palavrasOriginais, 4);
    setPalavras(palavrasEscolhidas);

    const palavrasJogo = palavrasEscolhidas.map((palavra) => palavra.name);
    setBoard({ game: new createGame(10, 10, palavrasJogo) });

    const coresAleatorias = palavrasEscolhidas.map(() => randomcolor());
    setCores(coresAleatorias);

    setStartTime(new Date());
    setModalVisible(false);
    setTempoDecorrido(0);
    }
    } catch (error) {
      console.error('Erro ao buscar dados: ', error);
    }
  };

  useEffect(() => {
    fetchData();

    return () => {
      isMountedRef.current = false;
    } 
  }, []);

  function selectLetter(item) {
    let game = board.game;
    game.board[item.row][item.column].setIsSelected(!item.isSelected);

    verificarPalavraSelecionada();
    setBoard({ game });
    verifyFindWord(item.word);
  }

  function getLetterSelectedSameWord(word) {
    let lettersSelected = 0;
  
    board.game.board.filter((row) => {
      lettersSelected =
        lettersSelected +
        row.filter((el) => {
          return el.word == word && el.isSelected;
        }).length;
    });
  
    return lettersSelected;
  }

  function verifyFindWord(words) {
    for (let word of words) {
      let lettersSelected = getLetterSelectedSameWord(word);

      if (lettersSelected === word.length) {
        palavras.forEach((palavra) => {
          if (palavra.name === word) {
            palavra.found = true;
            setPalavras([...palavras]);
          }
        });
      }

      userWin();
    }
  }

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
  
    setModalVisible(true);
    setTempoDecorrido(tempoFormatado);
  };

  const reiniciarJogo = () => {
    const palavrasOriginais = [
      { name: 'PAPAI', found: false },
      { name: 'MAMAE', found: false },
      { name: 'ANJO', found: false },
      { name: 'NEVE', found: false },
      { name: 'TRENÓ', found: false },
      { name: 'TOY', found: false },
      { name: 'GINGER', found: false },
      { name: 'SINOS', found: false },
      { name: 'ARVORE', found: false },
      { name: 'PENGU', found: false },
      { name: 'GRIFF', found: false },
      { name: 'CAMEL', found: false },
      { name: 'SANTA', found: false },
      { name: 'BELLS', found: false },
      { name: 'BOW', found: false },
      { name: 'CAROL', found: false },
      { name: 'CHIMNEY', found: false },
      { name: 'CUPIDO', found: false },
    ];

    const palavrasEscolhidas = selectRandomWords(palavrasOriginais, 4);
    setPalavras(palavrasEscolhidas);

    const palavrasJogo = palavrasEscolhidas.map((palavra) => palavra.name);
    setBoard({ game: new createGame(10, 10, palavrasJogo) });

    const coresAleatorias = palavrasEscolhidas.map(() => randomcolor());
    setCores(coresAleatorias);

 
    setStartTime(new Date());
    setModalVisible(false);
    setTempoDecorrido(0);
  };

  const closeModal = () => {
    reiniciarJogo();
  };


  return (
    <View style={styles.container}>
      <ImageBackground source={require('./../../../../../assets/templatejogo.jpg')} style={styles.imageBackground}>
        
        <TouchableOpacity onPress={mostrarDicaModal}>
          <View style={{ justifyContent: 'center', alignItems: 'center'}}>
            <ImageBackground
            source={require('./../../../../../assets/chapeu.png')}
            style={styles.Dica}
          ><Text style={styles.dicaNumber} onPress={mostrarDicaModal}>1</Text></ImageBackground>
          </View>
        </TouchableOpacity>


          <Ionicons style={styles.button} name="arrow-back" size={scale(40)} color="white"
            onPress={() => navigation.navigate('NivelFacil')} />


        <View style={styles.palavrasContainer}>
          {
            palavras.map((palavra, index) => (
              <Text key={index} style={[
                styles.palavras,
                (palavra.found) ? { backgroundColor: cores[index] } : null,
                (palavra.found) ? styles.wordFound : null,
              ]}>
                {palavra.name}
              </Text>
            ))
          }
        </View>
        <View style={styles.cacaContainer}>
          <ImageBackground
          source={require('./../../../../../assets/telaingameretangulo.png')}
          style={styles.retangulo}
        >
          
          <View style={styles.LetterContainer}>
          {
            board.game.board.map((row, indexRow) => (
              <View key={indexRow}>
                {
                  row.map((column, indexColumn) => (
                    <Text
                      style={[styles.Letter, (column.isSelected) ? styles.selected : null]}
                      key={indexColumn}
                      onPress={() => selectLetter(column)}
                    >
                      {column.letter}
                    </Text>
                  ))
                }
              </View>
            ))
          }
        </View>
        </ImageBackground>
        </View>
        
        

        <Modal isVisible={isDicaModalVisible} onBackdropPress={fecharDicaModal} style={styles.modalContainer2}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalText}>
            Dica:
          </Text>
          <Text style={styles.textDica}>
            {dicaPalavra}
          </Text>
          <TouchableOpacity style={styles.modalButton} onPress={revelarPalavraDica}>
            <Text style={styles.modalButtonText}>Revelar Palavra</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalButton} onPress={fecharDicaModal}>
            <Text style={styles.modalButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

        <Modal isVisible={isModalVisible} onBackdropPress={closeModal} style={styles.modalContainer2}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>
              TEMPO:
            </Text>
            <Text style={styles.textTempo}>
                {tempoDecorrido}s
            </Text> 
            <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
              <Text style={styles.modalButtonText}>Continuar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.modalButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <StatusBar style="auto" />
      </ImageBackground>
    </View>
  );
}