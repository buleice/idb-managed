/**
 * @file Provide unified formatted result for idb-managed
 */
export class ResultFormatter {
    readonly code: number;
    readonly msg: string;
    data: any;
    constructor(theCode: number, theMsg: string) {
        this.code = theCode;
        this.msg = theMsg;
    }
    setData(supplyment: Object) {
        this.data = { ...this.data, ...supplyment };
        return this;
    }
    toString() {
        return `FormattedResult{code: ${this.code}, msg: ${
            this.msg
        }, data: ${JSON.stringify(this.data)}}`;
    }
}

export default {
    get DB_NOT_SUPPORT() {
        return new ResultFormatter(100, 'IndexedDB is not supported');
    },
    get PARAM_INVALID() {
        return new ResultFormatter(101, 'Invalid parameter');
    },
    get SUCC() {
        return new ResultFormatter(200, 'Successfully done');
    },
    get DB_NOT_FOUND() {
        return new ResultFormatter(201, 'DB does not exist');
    },
    get TABLE_NOT_FOUND() {
        return new ResultFormatter(202, 'Table does not exist');
    },
    get OPEN_DB_FAIL() {
        return new ResultFormatter(203, 'Open DB failed');
    },
    get ADD_ITEMS_FAIL() {
        return new ResultFormatter(204, 'Add items failed');
    },
    get GET_ITEM_FAIL() {
        return new ResultFormatter(205, 'Get item failed');
    },
    get GET_IN_RANGE_FAIL() {
        return new ResultFormatter(206, 'Get items in range failed');
    },
    get DELETE_ITEMS_FAIL() {
        return new ResultFormatter(207, 'Delete items failed');
    },
    get DELETE_DB_FAIL() {
        return new ResultFormatter(208, 'Delete DB failed');
    },
    get UNEXPECTED_ERR() {
        return new ResultFormatter(666, 'Some unexpected error happens');
    }
};
