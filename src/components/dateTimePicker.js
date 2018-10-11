/* @flow */
import * as React from 'react';
import {
  StyleSheet,
  View,
  Platform,
  DatePickerAndroid,
  TimePickerAndroid,
  DatePickerIOS,
} from 'react-native';

import { CustomDialog } from './.';
import FormatHelper from '../utils/formatHelper';

const strings = require('@strings');

type Props = {
  value: string,
  mode: 'date' | 'time',
  defaultDate: Date,
  minDate?: Date,
  maxDate?: Date,
  onSelected?: (value: string, date: ?Date) => void,
  onCancel?: Function,
};
type State = {
  open: boolean,
  selectedDateIOS: Date,
};

class DateTimePicker extends React.PureComponent<Props, State> {
  static defaultProps = {
    value: '',
    mode: 'date',
    defaultDate: new Date(),
    dateConfig: {},
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      open: false,
      selectedDateIOS: this._getDefaultSelectedDate(),
    };
  }

  _getDefaultSelectedDate = () => {
    const { defaultDate, value } = this.props;
    let date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      date = defaultDate;
    }
    return date;
  }

  openPicker = async () => {
    const {
      defaultDate, minDate, maxDate, mode
    } = this.props;
    const date = this._getDefaultSelectedDate();

    if (Platform.OS === 'android') {
      if (mode === 'date') {
        try {
          const {
            action, year, month, day
          } = await DatePickerAndroid.open({
            date,
            minDate,
            maxDate,
            mode: 'spinner',
          });
          if (action !== DatePickerAndroid.dismissedAction) {
            const selected = `${year}/${this._formatDateNumber(month + 1)}/${this._formatDateNumber(day)}`;
            const mDate = new Date();
            mDate.setFullYear(year);
            mDate.setMonth(month);
            mDate.setDate(day);
            this.props.onSelected && this.props.onSelected(selected, mDate);
          } else {
            this.props.onCancel && this.props.onCancel();
          }
        } catch (error) {
          console.log(`Cannot open date picker ${error}`);
          this.props.onCancel && this.props.onCancel();
        }
      } else {
        try {
          const selectedHour = defaultDate.getHours();
          const selectedMinute = defaultDate.getMinutes();
          const { action, hour, minute } = await TimePickerAndroid.open({
            hour: selectedHour,
            minute: selectedMinute,
            is24Hour: true,
          });
          if (action !== TimePickerAndroid.dismissedAction) {
            const selected = `${this._formatDateNumber(hour)}:${this._formatDateNumber(minute)}`;
            const mDate = new Date();
            mDate.setHours(hour);
            mDate.setMinutes(minute);
            this.props.onSelected && this.props.onSelected(selected, mDate);
          } else {
            this.props.onCancel && this.props.onCancel();
          }
        } catch (error) {
          console.log(`Cannot open time picker ${error}`);
        }
      }
    } else {
      this.setState({
        open: true,
        selectedDateIOS: this._getDefaultSelectedDate()
      });
    }
  }

  _formatDateNumber = (val: number): string => `${val < 10 ? '0' : ''}${val}`

  _onDateChangeIOS = (date: Date) => {
    this.setState({ selectedDateIOS: date });
  }

  _onCancelIOS = () => {
    this.setState({ open: false });
    this.props.onCancel && this.props.onCancel();
  }

  _onSelectedIOS = () => {
    const format = (this.props.mode === 'date' ? 'yyyy/mm/dd' : 'HH:MM');
    const dateString = `${FormatHelper.simpleDateFormat(this.state.selectedDateIOS, format)}`;
    this.setState({ open: false });
    this.props.onSelected && this.props.onSelected(dateString, new Date(this.state.selectedDateIOS));
  }

  _renderPickerIOS = () => {
    const { minDate, maxDate, mode } = this.props;
    const actions = [
      { text: strings.cancel.toUpperCase(), onPress: () => this._onCancelIOS() },
      { text: strings.ok.toUpperCase(), onPress: () => this._onSelectedIOS() },
    ];
    return (
      <CustomDialog
        showing={this.state.open}
        onClose={this._onCancelIOS}
        cancelable={true}
        buttons={actions}
        contentStyle={styles.dialogContent}
      >
        <DatePickerIOS
          date={this.state.selectedDateIOS}
          mode={mode}
          onDateChange={this._onDateChangeIOS}
          maximumDate={maxDate}
          minimumDate={minDate}
          minuteInterval={1}
        />
      </CustomDialog>
    );
  }

  render() {
    return (
      <View>
        {Platform.OS === 'ios' && this._renderPickerIOS()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 8,
  },
  pickerItem: {
    color: 'rgba(0,0,0,0.87)',
  },
  inputText: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  selectorItem: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  selectorItemText: {
    flex: 1,
    color: 'rgba(0,0,0,0.87)',
    fontSize: 14,
    backgroundColor: 'transparent',
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  dialogContent: {
    marginTop: 8,
    marginBottom: 0,
    marginRight: 0,
    marginLeft: 0,
  },
});

module.exports = DateTimePicker;
