/* @flow */
import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Platform,
  TouchableOpacity,
  ViewPropTypes,
} from 'react-native';

type Props = {
  title: string,
  onPress: Function,
  bgColor?: string,
  textColor?: string,
  disabled?: ?boolean,
  containerStyle?: ViewPropTypes.style,
  source?: ViewPropTypes.style,
  imageStyle?: ViewPropTypes.style,
  fontSize?: number,
}

class BarBtn extends React.PureComponent<Props> {
  static defaultProps = {
    bgColor: '#2196F3',
    textColor: '#fff',
    disabled: false,
    fontSize: 14,
  };

  render() {
    const {
      bgColor, textColor, disabled, title, source, fontSize
    } = this.props;
    const buttonStyles = [styles.button, { backgroundColor: bgColor }];
    const textStyles = [styles.text, { color: textColor, fontSize }];
    if (disabled) {
      buttonStyles.push(styles.buttonDisabled);
      textStyles.push(styles.textDisabled);
    }

    return (
      <TouchableOpacity
        disabled={this.props.disabled}
        onPress={this.props.onPress}
        activeOpacity={0.5}
      >
        <View style={[buttonStyles, this.props.containerStyle]}>
          {(typeof source !== 'undefined') && <Image source={source} style={this.props.imageStyle} />}
          <Text style={textStyles} disabled={disabled}>{title}</Text>
        </View>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  button: {
    elevation: 4,
    borderRadius: 2,
  },
  text: {
    color: '#fff',
    backgroundColor: 'transparent',
    textAlign: 'center',
    padding: 8,
    fontSize: 14,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  buttonDisabled: {
    elevation: 0,
    backgroundColor: '#dfdfdf',
  },
  textDisabled:{
    color: '#a1a1a1',
  },
});

module.exports = BarBtn;
