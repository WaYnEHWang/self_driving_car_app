/* @flow */
import * as React from 'react';
import { TouchableOpacity, StyleSheet, Text, Platform, Image, ViewPropTypes, Linking } from 'react-native';
import Hyperlink from 'react-native-hyperlink';

import { ic_check_on, ic_check_off } from './img';
import { EULAModal } from './.';

const strings = require('@strings');

type Props = {
  checked: boolean,
  size?: number,
  fontSize?: number,
  color?: string,
  description?: string,
  checkedImage: ViewPropTypes.style,
  uncheckedImage: ViewPropTypes.style,
  onChecked: (checked: boolean) => void,
  isHyperlink?: boolean,
};

class Checkbox extends React.PureComponent<Props> {
  static defaultProps = {
    size: 24,
    fontSize: 14,
    color: '#fff',
    checkedImage: ic_check_on,
    uncheckedImage: ic_check_off,
    isHyperlink: false,
  }

  eulaModal: ?EULAModal;
  _onChecked = () => this.props.onChecked(!this.props.checked);

  openURL = (url: string) => {
    console.log(`Hyperlink url: ${url}`);
    if (url === 'https://eula') {
      this.eulaModal && this.eulaModal.show();
      return;
    }
    Linking.openURL(url);
  };

  render() {
    const source = this.props.checked ? this.props.checkedImage : this.props.uncheckedImage;
    if (this.props.isHyperlink) {
      return (
        <TouchableOpacity style={styles.container} onPress={this._onChecked}>
          <Image
            style={{ width: this.props.size, height: this.props.size }}
            source={source}
          />
          {this.props.description && (
            <Hyperlink
              linkStyle={[styles.description, { textDecorationLine: 'underline', }]}
              onPress={(url) => { this.openURL(url); }}
              linkText={url => (url === 'https://eula' ? strings.eula : (url === 'http://www.acer-group.com/public/index/privacy.htm' ? strings.acer_privacy : url))}
            >
              <Text style={styles.description}>{this.props.description}</Text>
            </Hyperlink>
          )}
          <EULAModal ref={(c) => { this.eulaModal = c; }} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={styles.container} onPress={this._onChecked}>
        <Image
          style={{ width: this.props.size, height: this.props.size }}
          source={source}
        />
        {this.props.description && (<Text style={styles.description}>{this.props.description}</Text>)}
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: {
    marginLeft: 8,
    backgroundColor: 'transparent',
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
    fontSize: 14,
    color: '#fff',
  }
});

module.exports = Checkbox;
