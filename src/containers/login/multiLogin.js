/* @flow */
import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  Platform,
  Image,
  NativeModules,
  TouchableOpacity,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { LoginManager, AccessToken } from 'react-native-fbsdk';
import { GoogleSignin, GoogleSigninButton, statusCodes } from 'react-native-google-signin';
import { ifIphoneX } from 'react-native-iphone-x-helper';

import * as reduxActions from '../../actions';
import {
  BarBtn, BasicController, LoadingModal, Checkbox
} from '../../components';
import RequestHelper from '../../utils/requestHelper';
import {
  ic_facebook_logo, ic_google_logo, ic_checked, ic_unchecked, img_signin_bg
} from '../../components/img';
import { NativeMqtt } from '../mqtt';

const strings = require('@strings');

const { FcmManager } = NativeModules;

const {
  width: deviceWidth,
  height: deviceHeight,
} = Dimensions.get('window');

type Props = {
  actions: reduxActions,
}
type State = {
  agreeCheck: boolean,
}
let enter_v2_counter = 0;
let fcmToken = '';

class MultiLogin extends BasicController<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      agreeCheck: false,
    };
    Actions.refresh({ hideNavBar: true });
    console.log('-----------------MultiLogin ctor-----------------');
  }

  _mqttId: any;

  // async componentWillMount() {
  // console.log('-----------------componentWillMount multiLogin-----------------');
  // Actions.refresh({ hideNavBar: true });
  // this.props.actions.enterVersionTwo_pro(true);
  // await NativeMqtt.set2v2_pro(true);
  // console.log('Enter the version two.(Production version.)');
  // fcmToken = await FcmManager.getFCMToken();
  // if (fcmToken === '' || fcmToken === null) {
  //   if (this.props.isConnected) {
  //     console.log(`componentWillMount fcmToken [${fcmToken}] ---> refreshFCMToken`);
  //     await FcmManager.refreshFCMToken();
  //     fcmToken = await FcmManager.getFCMToken();
  //   }
  // }
  // console.log(`fcmToken: ${fcmToken}`);
  // console.log(`-----------------componentWillMount multiLogin fcmToken: ${fcmToken}-----------------`);
  // }

  async componentDidMount() {
    console.log('-----------------componentDidMount multiLogin-----------------');
    this.props.actions.enterVersionTwo_pro(true);
    await NativeMqtt.set2v2_pro(true);
    console.log('Enter the version two.(Production version.)');
    fcmToken = await FcmManager.getFCMToken();
    if (fcmToken === '' || fcmToken === null || fcmToken === 'undefined') {
      if (this.props.isConnected) {
        console.log(`componentDidMount fcmToken [${fcmToken}] ---> refreshFCMToken`);
        await FcmManager.refreshFCMToken();
        fcmToken = await FcmManager.getFCMToken();
      }
    }
    console.log(`-----------------componentDidMount multiLogin fcmToken: ${fcmToken}-----------------`);
  }

  componentWillUnmount() {
    console.log('-----------------componentDidMount componentWillUnmount-----------------');
    this._timeoutID && clearTimeout(this._timeoutID);
    enter_v2_counter = 0;
  }

  _loadingModal: ?LoadingModal;

  _timeoutID: ?any;

  _loginFB_V2 = async () => {
    if (this.props.isConnected) {
      console.log('Login FB V2');
      if (fcmToken === null || fcmToken === '' || fcmToken === 'undefined') {
        await FcmManager.refreshFCMToken();
        fcmToken = await FcmManager.getFCMToken();
        this.hanndleFcmTokenError();
      } else {
        LoginManager.logInWithReadPermissions(['public_profile', 'email']).then(
          (result) => {
            if (result.isCancelled) {
              console.log('Login FB V2 cancelled');
            } else {
              AccessToken.getCurrentAccessToken().then((data) => {
                if ((data == null) || (data.accessToken == null)) {
                  this.handleServerError(RequestHelper.errorCode.FACE_BOOK_ERROR);
                } else {
                  const accessToken = data.accessToken.toString();
                  console.log(`FacebookLogin V2 success accessToken = ${accessToken}`);
                  this.getFBUserData(accessToken);
                }
              });
            }
          },
          (error) => {
            console.log(`FBLogin V2 fail with error: ${error}`);
            this.handleServerError(RequestHelper.errorCode.FACE_BOOK_ERROR);
          }
        );
      }
    } else {
      this.handleNoNetworkError();
    }
  };

  signInGoogle = async () => {
    if (this.props.isConnected) {
      if (fcmToken === null || fcmToken === '' || fcmToken === 'undefined') {
        await FcmManager.refreshFCMToken();
        fcmToken = await FcmManager.getFCMToken();
        this.hanndleFcmTokenError();
      } else {
        try {
          await GoogleSignin.hasPlayServices();
          GoogleSignin.configure(RequestHelper.getGoogleConfigure());
          const userInfo = await GoogleSignin.signIn();
          console.log(`GoogleLogin V2 success userInfo.idToken = ${userInfo.idToken}`);
          console.log(`user email = ${userInfo.user.email}`);
          this.authServer_V2('3', userInfo.idToken, userInfo.user.email);
        } catch (error) {
          console.log('GoogleLogin V2 error', error,  error.code, error.message);
          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            // user cancelled the login flow
            console.log('Loginin Google cancelled');
          } else if (error.code === statusCodes.IN_PROGRESS) {
            // operation (f.e. sign in) is in progress already
            console.log('Loginin Google IN_PROGRESS');
          } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            // play services not available or outdated
            console.log('Loginin Google PLAY_SERVICES_NOT_AVAILABLE');
          } else {
            // some other error happened
            this.handleServerError(RequestHelper.errorCode.GOOGLE_ERROR);
          }
        }
      }
    } else {
      this.handleNoNetworkError();
    }
  };

  // _loginGoogle_V2 = async () => {
  //   console.log('Login Google V2');
  //   if (this.props.isConnected) {
  //     if (fcmToken === null || fcmToken === '') {
  //       await FcmManager.refreshFCMToken();
  //       fcmToken = await FcmManager.getFCMToken();
  //       this.hanndleFcmTokenError();
  //     } else {
  //       GoogleSignin.hasPlayServices().then(() => {
  //         // play services are available. can now configure library
  //         GoogleSignin.configure(RequestHelper.getGoogleConfigure())
  //           .then(() => {
  //             GoogleSignin.currentUserAsync().then((user) => {
  //               GoogleSignin.signIn().then((userInfo) => {
  //                 console.log('GoogleLogin V2 USER data', userInfo);
  //                 console.log(`GoogleLogin V2 success userInfo.idToken = ${userInfo.idToken}`);
  //                 console.log(`user email = ${userInfo.email}`);
  //                 this.authServer_V2('3', userInfo.idToken, userInfo.email);
  //               }).catch((err) => {
  //                 console.log('Google signin V2 error', err.code, err.message);
  //                 if (err.code === statusCodes.SIGN_IN_CANCELLED) {
  //                   // sign in was cancelled
  //                 } else if (err.code === statusCodes.IN_PROGRESS) {
  //                   // operation (f.e. sign in) is in progress already
  //                 } else {
  //                   // Something else went wrong
  //                   this.handleServerError(RequestHelper.errorCode.GOOGLE_ERROR);
  //                 }
  //               }).done();
  //             }).done();
  //           });
  //       })
  //         .catch((err) => {
  //           console.log('GoogleLogin V2 error', err,  err.code, err.message);
  //           this.handleServerError(RequestHelper.errorCode.GOOGLE_ERROR);
  //         });
  //     }
  //   } else {
  //     this.handleNoNetworkError();
  //   }
  // };

  authServer_V2 = async (provider: string, token: string, userEmail: string) => {
    this._loadingModal && this._loadingModal.showLoadingPage();
    console.log(`authServer V2 provider: ${provider}, token: ${token}, email: ${userEmail}, fcm token: ${fcmToken}`);
    // const fcmToken = await FcmManager.getFCMToken();
    // console.log(`authServer V2 fcmToken: ${fcmToken}`);
    if (fcmToken === '' || fcmToken === null || fcmToken === 'undefined') {
      await FcmManager.refreshFCMToken();
      fcmToken = await FcmManager.getFCMToken();
      console.log(`authServer V2 fcmToken ${fcmToken}`);
    }
    const { errorCode, errorMessage, content } = await RequestHelper.getResponse(
      (this.props.enterVersionTwo_pro) ? RequestHelper.getServiceURL_V2_pro(RequestHelper.V2_USER_LOGIN) : RequestHelper.getServiceURL_V2_debug(RequestHelper.V2_USER_LOGIN),
      'POST',
      JSON.stringify({
        type: provider,
        email: userEmail,
        social_token: token,
        fcm_token: fcmToken,
        device: Platform.OS
      }),
      { 'content-type': 'application/json' },
    );
    this._loadingModal && this._loadingModal.hideLoadingPage();
    if (errorCode === RequestHelper.errorCode.NO_ERROR) {
      console.log(`authServer V2 success loginInfo = ${JSON.stringify(content)}`);
      // await this.getStopPointsFromServer(content.token, userEmail);
      this.props.actions.accountTypeEdit(content.accountType);
      this.props.actions.accessTokenEdit(content.token);
      // this.props.actions.accountIdEdit(content.account);
      this.props.actions.accountEmailEdit(userEmail);
      this.props.actions.finishLogin(true);
      if (Platform.OS === 'android' && content.accountType === 'admin') {
        NativeMqtt.setAccountType(content.accountType);
      }
    } else {
      // const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
      this.handleServerError(errorCode);
      console.log(`authServer V2 fail error msg = ${errorMessage}`);
    }
  }

  getStopPointsFromServer = async (Token: string, Email: string) => {
    const { content } = await RequestHelper.getResponse(
      RequestHelper.getServiceURL(RequestHelper.SERVER_USER_INFO),
      'POST',
      JSON.stringify({
        type: 'POSITION',
        email: Email,
        token: Token,
      })
    );
    if (content.status) {
      let list = [];
      list = list.concat(content.points);
      this.props.actions.stopPointsEdit(list);
      console.log(`getStopPointsFromServer success list = ${JSON.stringify(list)}`);
    } else {
      this._loadingModal && this._loadingModal.hideLoadingPage();
      this._timeoutID = setTimeout(() => {
        const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
        this.handleServerError(errorCode);
        if (Number(content.error) > 900 && Number(content.error) < 905) {
          RequestHelper.handleLogout(this.props.actions);
        }
      }, 200);
    }
  }

  getFBUserData = async (token: string) => {
    await fetch(RequestHelper.V2_GET_USER_EMAIL.concat(token))
      .then(response => response.json())
      .then((json) => {
        if (json.email) {
          console.log(`Getting email from facebook success email = ${json.email}`);
          this.authServer_V2('2', token, json.email);
        }
      })
      .catch((error) => {
        console.log('ERROR GETTING DATA FROM FACEBOOK', error);
      });
  }

  _onCheckChanged = check => this.setState({ agreeCheck: check });

  _onTouch = async () => {
    enter_v2_counter++;
    console.log(`enter_v2_counter ${enter_v2_counter}`);
    if (enter_v2_counter === 10 && this.props.enterVersionTwo_pro) {
      this.props.actions.enterVersionTwo_pro(false);
      await NativeMqtt.set2v2_pro(false);
      console.log('You can enter the version two.(Debug version.)');
      enter_v2_counter = 0;
    }
    else {
      if (!this.props.enterVersionTwo_pro) {
        this.props.actions.enterVersionTwo_pro(true);
        await NativeMqtt.set2v2_pro(true);
        console.log('You can enter the version two.(Production version.)');
      }
    }
  }

  _renderSignInText = () => {
    if (this.props.enterVersionTwo_pro) {
      const signinV2Str = `${strings.sign_in_with} V2`;
      return (
        <Text style={styles.signin}>
          {signinV2Str}
        </Text>);
    }
    else {
      const signinV2Str = `${strings.sign_in_with} V2 Debug`;
      return (
        <Text style={styles.signin}>
          {signinV2Str}
        </Text>);
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.subView}>
          <TouchableOpacity
            onPress={this._onTouch}
            activeOpacity={0.5}
          >
            <Image
              style={styles.ShuttleLogo}
              source={img_signin_bg}
            />
          </TouchableOpacity>
          <Text style={styles.descText}>
            {strings.eula_content}
          </Text>
          <View style={{ marginHorizontal: 32, }}>
            <Checkbox
              checked={this.state.agreeCheck}
              onChecked={this._onCheckChanged}
              checkedImage={ic_checked}
              uncheckedImage={ic_unchecked}
              size={18}
              isHyperlink={true}
              description={strings.check_eula}
            />
          </View>
        </View>
        {this._renderSignInText()}
        <View style={{ flexDirection: 'row', marginHorizontal: 16 }}>
          <BarBtn
            onPress={this.signInGoogle}
            title="GOOGLE"
            bgColor="#fff"
            containerStyle={styles.btnContainer}
            source={ic_google_logo}
            imageStyle={styles.logoIcon}
            textColor="rgba(0, 0, 0, 0.54)"
            disabled={!this.state.agreeCheck}
          />
          <BarBtn
            onPress={this._loginFB_V2}
            source={ic_facebook_logo}
            imageStyle={styles.logoIcon}
            title="FACEBOOK"
            bgColor="#fff"
            textColor="rgb(59, 89, 152)"
            containerStyle={[styles.btnContainer, { marginLeft: 16 }]}
            disabled={!this.state.agreeCheck}
          />
        </View>
        <LoadingModal ref={(c) => { this._loadingModal = c; }} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgb(48, 184, 249)',
  },
  logTitle: {
    fontSize: 32,
    color: '#fff',
    ...Platform.select({ android: { fontFamily: 'sans-serif-light' } }),
    backgroundColor: 'transparent',
  },
  btnContainer: {
    height: 40,
    width: (deviceWidth - 48) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 4,
    ...Platform.select({
      android: {
        marginBottom: 16,
      },
      ios: {
        ...ifIphoneX({ marginBottom: 40 }, { marginBottom: 20 }),
      }
    }),
  },
  logoIcon: {
    width: 18,
    height: 18,
    marginRight: 8
  },
  ShuttleLogo: {
    width: deviceWidth,
    height: 235 * (deviceWidth / 356),
  },
  signin: {
    marginBottom: 16,
    alignSelf: 'center',
    fontSize: 16,
    color: '#fff',
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    backgroundColor: 'transparent',
  },
  subView: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  descText: {
    fontSize: 12,
    color: '#fff',
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
    backgroundColor: 'transparent',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
    marginHorizontal: 16,
  },
});

function select(store) {
  return {
    isConnected: store.network.isConnected,
    finishLogin: store.settings.finishLogin,
    enterVersionTwo_pro: store.settings.enterVersionTwo_pro,
  };
}

module.exports = connect(
  select,
  dispatch => ({
    actions: bindActionCreators(reduxActions, dispatch)
  })
)(MultiLogin);
