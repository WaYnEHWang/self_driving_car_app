/* @flow */

const FormatHelper = {
  DATE_FORMAT_TYPE: {
    yyMMdd: 'yyyy/mm/dd',
    yyyyMMddHHmm: 'yyyy/MM/dd HH:mm',
    yyyyMMddHHmmss: 'yyyy/MM/dd HH:mm:ss',
    MMMMddYYYY: 'MMMM dd YYYY',
    HHmm : 'HH:mm',
  },
  TIME_FORMAT_TYPE: {
    HHmmss: 'HH:mm:ss',
    mmss: 'mm:ss',
    HHmm: 'HH:mm',
  },
  MONTH: [
    'Jan', 'Feb', 'Mar',
    'Apr', 'May', 'Jun', 'July',
    'Aug', 'Sep', 'Oct',
    'Nov', 'Dec'
  ],

  /* formatType = one of DATE_FORMAT_TYPE */
  simpleDateFormat(date: Date, formatType: string = FormatHelper.DATE_FORMAT_TYPE.yyyyMMddHHmmss) {
    const year = new Date(date).getFullYear();
    const month = this._formatDateVal(new Date(date).getMonth() + 1);
    const day = this._formatDateVal(new Date(date).getDate());
    const hour = this._formatDateVal(new Date(date).getHours());
    const min = this._formatDateVal(new Date(date).getMinutes());
    const sec = this._formatDateVal(new Date(date).getSeconds());

    if (formatType === this.DATE_FORMAT_TYPE.yyMMdd) {
      return `${year}/${month}/${day}`;
    } else if (formatType === this.DATE_FORMAT_TYPE.yyyyMMddHHmm) {
      return `${year}/${month}/${day} ${hour}:${min}`;
    } else if (formatType === this.DATE_FORMAT_TYPE.MMMMddYYYY) {
      return `${this.MONTH[date.getMonth()]} ${day} ${year}`;
    } else if (formatType === this.DATE_FORMAT_TYPE.HHmm) {
      return `${hour}:${min}`;
    } else {
      return `${year}/${month}/${day} ${hour}:${min}:${sec}`;
    }
  },

  formatSecondTime(sec: number, formatType: string = FormatHelper.TIME_FORMAT_TYPE.mmss): { hour: ?number, min: ?number, sec: ?number } {
    if (formatType === this.TIME_FORMAT_TYPE.HHmm) {
      return { hour: Math.floor(sec / 3600), min: (sec / 60) };
    } else if (formatType === this.TIME_FORMAT_TYPE.HHmmss) {
      return { hour: Math.floor(sec / 3600), min: Math.floor((sec % 3600) / 60), sec: (sec % 60) };
    } else {
      return { min: Math.floor(sec / 60), sec: (sec % 60) };
    }
  },

  _formatDateVal(dateNum: number): string {
    return (dateNum < 10 ? '0' : '') + dateNum;
  },
};

module.exports = FormatHelper;
