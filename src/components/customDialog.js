/* @flow */
import * as React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  ViewPropTypes,
} from 'react-native';
import theme from '../utils/basicStyle';

type Props = {
  children: React.ChildrenArray<React.Element<any>>,
  showing: boolean,
  title: string,
  buttons: Array<{
    text: string,
    onPress: Function,
    textStyle?: Object,
  }>,
  contentStyle?: ViewPropTypes.style,
  onClose: Function,
  cancelable: boolean,
  kbBehavior?: 'height' | 'position' | 'padding',
};

class CustomDialog extends React.Component<Props> {
  static defaultProps = {
    showing: false,
    title: '',
    buttons: [],
    cancelable: false,
  }

  _renderTitle = (): ?React.Element<any> => {
    if (this.props.title && this.props.title !== '') {
      return (
        <Text style={styles.titleText}>{this.props.title}</Text>
      );
    }
  }

  _renderContainer = () => {
    if (this.props.kbBehavior !== '') {
      return (
        <KeyboardAvoidingView behavior={this.props.kbBehavior} style={{ flex: 1 }}>
          {this._renderContent()}
        </KeyboardAvoidingView>
      );
    } else {
      return this._renderContent();
    }
  }

  _renderContent = (): React.Element<any> => (
    <TouchableOpacity
      style={styles.windowBackground}
      activeOpacity={1}
      onPress={() => this.props.cancelable && this.props.onClose && this.props.onClose()}
    >
      <View style={styles.containerArea}>
        <View style={[styles.contentArea, this.props.contentStyle]}>
          {this._renderTitle()}
          {this.props.children}
        </View>

        {this.props.buttons.length !== 0 && (
          <View style={styles.actionArea}>
            {this.props.buttons.map((item, position) => (
              <TouchableOpacity key={`actions-${String(position)}`} activeOpacity={1} onPress={item.onPress}>
                <Text style={[styles.actionText, item.textStyle]}>{item.text.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  render() {
    return (
      <Modal
        animationType="none"
        transparent={true}
        visible={this.props.showing}
        onRequestClose={() => this.props.onClose && this.props.onClose()}
      >
        {this._renderContainer()}
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  windowBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerArea: {
    ...theme.card,
    width: 280,
    flexDirection: 'column',
  },
  contentArea: {
    flexDirection: 'column',
    marginTop: 24,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  titleText: {
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 20,
    color: 'rgba(0, 0, 0, 0.87)',
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium', }, }),
  },
  actionArea: {
    height: 36,
    marginTop: 8,
    marginBottom: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionText: {
    padding: 8,
    marginRight: 8,
    fontSize: 14,
    color: '#4caf50',
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium', }, }),
  },
});

module.exports = CustomDialog;
