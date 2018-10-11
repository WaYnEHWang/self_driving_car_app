/* @flow */
import * as React from 'react';
import {
  Modal,
  StyleSheet,
  View,
  ActivityIndicator
} from 'react-native';

type State = {
  visible: boolean,
  animate: boolean,
};

class LoadingModal extends React.Component<{}, State> {
  constructor() {
    super();
    this.state = {
      visible: false,
      animate: false,
    };
  }

  showLoadingPage() {
    this.setState({
      visible: true,
      animate:true,
    });
  }

  hideLoadingPage() {
    this.setState({
      visible: false,
      animate: false,
    });
  }

  render() {
    return (
      <Modal
        animationType="none"
        transparent={true}
        visible={this.state.visible}
        onRequestClose={() => console.log('Modal has been closed.')}
      >
        <View style={styles.container}>
          <ActivityIndicator animating={this.state.animate} color="gray" size="large" />
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 100,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
});

module.exports = LoadingModal;
