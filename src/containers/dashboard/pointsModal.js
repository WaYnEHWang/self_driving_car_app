/* @flow */
import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
  TouchableNativeFeedback,
  Modal,
} from 'react-native';
import Geocoder from 'react-native-geocoder';
import theme from '../../utils/basicStyle';

const strings = require('@strings');

type Props = {
  onPress: Function,
}

type State ={
  showing: boolean,
  fTitle: string,
  sTitle: string,
  selectPoint: string,
  address: string,
}

// const points = [strings.start_point, strings.end_point];

class PointsModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showing: false,
      // fTitle: '',
      // sTitle: '',
      // selectPoint: '',
      address: '',
    };
  }

  close = () => {
    this.setState({ showing: false });
  }

  show = (point: string) => {
    this.setState({
      showing: true,
      address: point,
      // sTitle: points[1],
      // selectPoint: point,
    });
  }

  LatLngToAddress = async (latlng) => {
    const position = {
      lat: latlng.latitude,
      lng: latlng.longitude
    };
    try {
      const res = await Geocoder.geocodePosition(position);
      const addr = res[0].formattedAddress;
      this.setState({
        showing: true,
        address: addr,
      });
    }
    catch (err) {
      console.log(err);
    }
  }

  /* pressItem = (title: string) => {
    const index = points.findIndex(value => value === title);
    if (index !== -1) {
      this.props.onPress(index, this.state.selectPoint);
    }
    this.setState({ showing: false });
  } */

  render() {
    // const Touchable = Platform.OS === 'android' ? TouchableNativeFeedback : TouchableOpacity;
    return (
      <Modal
        animationType="none"
        transparent={true}
        visible={this.state.showing}
        onRequestClose={() => console.log('close modle')}
      >
        <TouchableOpacity
          style={styles.windowBackground}
          activeOpacity={1}
          onPress={() => this.close()}
        >
          <View style={styles.containerArea}>
            <View style={styles.callOutView}>
              <Text style={styles.carStateText}>
                {this.state.address}
              </Text>
            </View>

            {/* {(this.state.sTitle.length > 0) &&
              <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.12)' }} />
            }
            {(this.state.sTitle.length > 0) &&
              <Touchable
                onPress={() => { this.pressItem(this.state.sTitle); }}
              >
                <View style={styles.callOutView}>
                  <Text style={styles.carStateText}>{this.state.sTitle}</Text>
                </View>
            </Touchable>} */}
          </View>
        </TouchableOpacity>
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
    width: 350,
    flexDirection: 'column',
  },
  callOutView: {
    width: 350,
    height: 80,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carStateText: {
    backgroundColor: '#fff',
    color: 'rgba(0, 0, 0, 0.87)',
    fontSize: 16,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
});

module.exports = PointsModal;
