/* @flow */

const ApiHelper = {
  checkRequestStatus(status: number): boolean {
    return (status > 99 && status !== 102 && status !== 108 && status !== 109 && status !== 110 && status !== 111 && status !== 112);
  },
};

const ApiHelper_V2 = {
  checkRequestStatus(status: number): boolean {
    return (status > 99 && status !== 108 && status !== 999);
  },
};

module.exports = { ApiHelper, ApiHelper_V2 };
