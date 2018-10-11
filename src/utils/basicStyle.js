/* @flow */
import { Platform } from 'react-native';
import { ifIphoneX } from 'react-native-iphone-x-helper';

const shadow = {
  ...Platform.select({
    ios: {
      shadowColor: '#222222',
      shadowOpacity: 0.4,
      shadowRadius: 2,
      shadowOffset: {
        height: 1,
        width: 0
      }
    },
    android: {
      elevation: 5,
    },
  }),
};

const fontSizes = {
  A: {
    fontSize: 24,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  B1: {
    fontSize: 20,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  B2: {
    fontSize: 20,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  C1: {
    fontSize: 14,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  C2: {
    fontSize: 14,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  D: {
    fontSize: 12,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  E: {
    fontSize: 8,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
};

const fontColors = {
  W1: { color: '#b2b4b2' },
  W2: { color: '#a2aaad' },
  W3: { color: '#707f88' },
  W4: { color: '#56626b' },
  W5: { color: '#3f484f' },
  W6: { color: '#2f3d43' },
};

export default {
  containerStyle: {
    flex: 1,
    flexDirection: 'column',
    ...Platform.select({
      android: {
        paddingTop: 54
      },
      ios: {
        ...ifIphoneX({ paddingTop: 88, paddingBottom: 34 }, { paddingTop: 64 }),
      }
    }),
  },
  containerWithoutNavBarStyle: {
    flex: 1,
    flexDirection: 'column',
    ...Platform.select({
      android: {
        paddingTop: 5
      },
      ios: {
        ...ifIphoneX({ paddingTop: 44, paddingBottom: 34 }, { paddingTop: 20 }),
      }
    }),
  },
  shadow,
  card: {
    backgroundColor: '#fff',
    borderRadius: 2,
    ...shadow,
  },
  // style for mileage item card
  MileageItem: {
    light: {
      backgroundColor: '#fff',
      descText: {
        backgroundColor: 'transparent',
        ...fontSizes.B1,
        ...fontColors.W5,
      },
      titleColor: fontColors.W3.color,
      valueColor: fontColors.W6.color,
      unitColor: fontColors.W4.color,
    },
    gray: {
      backgroundColor: '#f0f0f0',
      descText: {
        backgroundColor: 'transparent',
        ...fontSizes.B1,
        ...fontColors.W5,
      },
      titleColor: fontColors.W3.color,
      valueColor: fontColors.W6.color,
      unitColor: fontColors.W4.color,
    },
  },
  InputText: {
    basic: {
      titleStyle: {
        color: 'rgba(0,0,0,0.54)',
        fontSize: 14,
        backgroundColor: 'transparent',
        ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
      },
      errorStyle: {
        color: '#f00',
        fontSize: 12,
        backgroundColor: 'transparent',
        ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
      },
      containerStyle: {
        marginBottom: 8,
      },
      inputAreaStyle: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.54)',
      }
    },
    plain: {
      titleStyle: {
        color: 'rgba(0,0,0,0.54)',
        fontSize: 14,
        backgroundColor: 'transparent',
        ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
      },
      errorStyle: {
        color: '#f00',
        fontSize: 12,
        backgroundColor: 'transparent',
        ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
      },
      containerStyle: {
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 8,
      },
      inputAreaStyle: {
        marginTop: 8,
      },
    }
  },
  navBar: {
    headerArea: {
      position: 'absolute',
      backgroundColor: 'transparent',
      left: 0,
      right: 0,
      flexDirection: 'row',
      ...Platform.select({
        ios: {
          ...ifIphoneX({ height: 88 }, { height: 64 }),
        },
        android: {
          height: 54,
        },
      }),
    },
    leftItemStyle: {
      position: 'absolute',
      ...Platform.select({
        ios: {
          ...ifIphoneX({ top: 44 }, { top: 20 }),
        },
        android: {
          top: 8,
        },
      }),
      left: 0,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    rightItemStyle: {
      position: 'absolute',
      flexDirection: 'row',
      ...Platform.select({
        ios: {
          ...ifIphoneX({ top: 44 }, { top: 20 }),
        },
        android: {
          top: 8,
        },
      }),
      right: 0,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    rightItemContainer: { // for custom right btn
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 14,
    },
  },
  router: {
    navbarStyle: {
      borderBottomWidth: 0,
      backgroundColor: 'rgb(48, 184, 249)',
      ...ifIphoneX({ height: 88 }, {}),
    },
    leftBtnStyle: {
      paddingLeft: 14,
      ...Platform.select({
        ios: {
          ...ifIphoneX({ top: 44 }, { top: 20 }),
        },
      }),
    },
    rightBtnStyle: {
      ...Platform.select({
        ios: {
          ...ifIphoneX({ top: 44 }, { top: 20 }),
        },
      }),
    },
    titleWrapperStyle: {
      ...Platform.select({
        ios: {
          ...ifIphoneX({ top: 44 }, { top: 20 }),
        },
      }),
    }
  },
  // match with uid
  fontSizes,
  fontColors,
  pressedColor: 'rgba(203,36,51,0.12)',
  xColor: '#cb2433',
  zColor: '#4ab734',
  yColor: '#83b81a',
  gradient: ['#cb2433', '#93000d']
};
