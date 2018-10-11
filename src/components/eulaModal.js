/* @flow */
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Modal,
  Platform,
  WebView
} from 'react-native';

const strings = require('@strings');

const {
  width: deviceWidth,
  height: deviceHeight,
} = Dimensions.get('window');

type Props = {
  isNotice: boolean,
  onAgreed?: (agreed: boolean) => void,
};

type State ={
  modalVisible: boolean,
}

class EULAModal extends React.Component<Props, State> {
  static defaultProps = {
    isNotice: false,
  }
  constructor(props: Props) {
    super(props);
    this.state = {
      modalVisible: false,
    };
  }
  state: State;
  EULA: any;
  NOTICE: any;

  show() {
    this.setState({ modalVisible: true });
  }

  close() {
    this.setState({ modalVisible: false });
    this.props.onAgreed && this.props.onAgreed(false);
  }

  agree() {
    this.setState({ modalVisible: false });
    this.props.onAgreed && this.props.onAgreed(true);
  }

  getEULA = () => {
    const myLanguage = strings.getInterfaceLanguage().toLowerCase();
    let filename = 'EULA.html';
    let file = require('./../webview/EULA.html');
    if (myLanguage.includes('zh')) {
      filename = 'file:///android_asset/EULA_zh.html';
      file = require('./../webview/EULA_zh.html');
    } else {
      filename = 'file:///android_asset/EULA.html';
      file = require('./../webview/EULA.html');
    }
    return (Platform.OS === 'android') ? filename : file;
  };

  getNotice = () => {
    const filename = 'file:///android_asset/NOTICE.html';
    const file = require('./../webview/NOTICE.html');
    return (Platform.OS === 'android') ? filename : file;
  }

  render() {
    this.EULA = this.getEULA();
    this.NOTICE = this.getNotice();
    const EULAsrc = (Platform.OS === 'android') ? { uri: this.EULA } : this.EULA;
    const Noticesrc = (Platform.OS === 'android') ? { uri: this.NOTICE } : this.NOTICE;
    // console.log(`EULAModal this.EULA = ${this.EULA}`);
    return (
      <Modal
        animationType="none"
        transparent={true}
        visible={this.state.modalVisible}
        onRequestClose={this.close}
      >
        <View style={styles.container}>
          <View style={styles.innerContainer}>
            <View style={styles.subView}>
              <WebView
                source={this.props.isNotice ? Noticesrc : EULAsrc}
                scalesPageToFit={false}
              />
            </View>
            <View style={styles.ButtonViewStyle}>
              {this.props.isNotice &&
                <TouchableOpacity
                  style={styles.ButtonStyle}
                  onPress={() => { this.agree(); }}
                  activeOpacity={0.5}
                >
                  <Text style={styles.ButtonTextStyle}>
                    {strings.agree.toUpperCase()}
                  </Text>
                </TouchableOpacity>}
              <TouchableOpacity
                style={styles.ButtonStyle}
                onPress={() => { this.close(); }}
                activeOpacity={0.5}
              >
                <Text style={styles.ButtonTextStyle}>
                  {strings.close.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: deviceWidth,
    height: deviceHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  innerContainer: {
    backgroundColor: 'white',
    borderRadius: 1,
    height: deviceHeight - 100,
    width:  deviceWidth - 32,
  },
  subView: {
    height: deviceHeight - 152,
    width: deviceWidth - 32,
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight:16,
    paddingTop: 16,
    paddingBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ButtonViewStyle:{
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ButtonStyle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    height: 36,
    marginTop: 8,
    marginBottom: 8,
  },
  ButtonTextStyle: {
    fontSize: 14,
    color: '#52b7a2',
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    textAlign : 'center',
  },
  pickerDot: {
    fontSize: 14,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
    color: 'rgba(0,0,0,0.87)',
    paddingLeft: 8,
    paddingRight:8,
  }
});

module.exports = EULAModal;
