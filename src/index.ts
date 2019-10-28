import DBEnvChecker from './lib/db_env_checker';
import FormattedResult from './lib/formatted_result';
import DBWrapper from './db_wrapper';
import { ParamCheckerEnum, paramChecker, optionWithBackup } from './lib/utils';
import {
    DBConfig,
    ItemConfig,
    TableConfig,
    TableIndexRange,
    MiliSeconds
} from './interface';
export * from './interface';
const DEFAULT_DB_VERSION: number = 1;
const OPTIONAL = true;
function _customDBConfigChecker(dbConfig: DBConfig): void {
    paramChecker(
        dbConfig,
        ParamCheckerEnum.NotNullObject,
        'dbConfig',
        !OPTIONAL
    );
    paramChecker(dbConfig.dbName, ParamCheckerEnum.String, 'dbName', !OPTIONAL);
    paramChecker(
        dbConfig.dbVersion,
        ParamCheckerEnum.NonNegativeInteger,
        'dbVersion',
        OPTIONAL
    );
    paramChecker(
        dbConfig.itemDuration,
        ParamCheckerEnum.NonNegativeInteger,
        'itemDuration of dbConfig',
        OPTIONAL
    );
    paramChecker(
        dbConfig.tables,
        ParamCheckerEnum.NotNullObject,
        'tables',
        OPTIONAL
    );
    Object.keys(dbConfig.tables || {}).forEach(tableName => {
        const tableConfig = dbConfig.tables![tableName];
        paramChecker(
            tableConfig.primaryKey,
            ParamCheckerEnum.String,
            'primaryKey',
            OPTIONAL
        );
        paramChecker(
            tableConfig.itemDuration,
            ParamCheckerEnum.NonNegativeInteger,
            'itemDuration of table',
            OPTIONAL
        );
        paramChecker(
            tableConfig.indexList,
            ParamCheckerEnum.Array,
            'indexList',
            OPTIONAL
        );
        (tableConfig.indexList || []).forEach(index => {
            paramChecker(
                index.indexName,
                ParamCheckerEnum.String,
                'indexName',
                !OPTIONAL
            );
            paramChecker(
                index.unique,
                ParamCheckerEnum.Boolean,
                'unique',
                OPTIONAL
            );
        });
    });
}

function _customDBAddItemsParamChecker(
    items: ItemConfig[],
    tableListInDB: TableConfig[]
): void {
    paramChecker(items, ParamCheckerEnum.Array, 'items', !OPTIONAL);
    items.forEach(itemOfTable => {
        paramChecker(
            itemOfTable.tableName,
            ParamCheckerEnum.String,
            "item's tableName",
            !OPTIONAL
        );
        paramChecker(
            itemOfTable.itemDuration,
            ParamCheckerEnum.NonNegativeInteger,
            "item's itemDuration",
            OPTIONAL
        );
        const theTable = tableListInDB.find(
            table => table.tableName === itemOfTable.tableName
        );
        if (!theTable) {
            throw `Table ${itemOfTable.tableName} does not exist`;
        } else if (
            theTable.primaryKey !== undefined &&
            Object.getOwnPropertyNames(itemOfTable.item).indexOf(
                theTable.primaryKey
            ) < 0
        ) {
            throw `primaryKey is needed for item in table ${itemOfTable.tableName}`;
        }
    });
}

function tableIndexRangeParamChecker(tableIndexRange: TableIndexRange): void {
    paramChecker(
        tableIndexRange,
        ParamCheckerEnum.NotNullObject,
        'tableIndexRange',
        !OPTIONAL
    );
    paramChecker(
        tableIndexRange.tableName,
        ParamCheckerEnum.String,
        "tableIndexRange's",
        !OPTIONAL
    );
    paramChecker(
        tableIndexRange.indexRange,
        ParamCheckerEnum.NotNullObject,
        "tableIndexRange's indexRange",
        OPTIONAL
    );
    if (tableIndexRange.indexRange) {
        const {
            indexName,
            lowerExclusive,
            upperExclusive
        } = tableIndexRange.indexRange;
        paramChecker(
            indexName,
            ParamCheckerEnum.String,
            "indexRange's indexName",
            !OPTIONAL
        );
        paramChecker(
            lowerExclusive,
            ParamCheckerEnum.Boolean,
            "indexRange's lowerExclusive",
            OPTIONAL
        );
        paramChecker(
            upperExclusive,
            ParamCheckerEnum.Boolean,
            "indexRange's upperExclusive",
            OPTIONAL
        );
    }
}

export function idbIsSupported(): boolean {
    let supportResult = DBEnvChecker.getResult();
    return supportResult !== FormattedResult['DB_NOT_SUPPORT'];
}
export class CustomDB {
    readonly name: string;
    readonly version: number;
    readonly tableList: TableConfig[];
    readonly itemDuration?: MiliSeconds;
    constructor(dbConfig: DBConfig) {
        try {
            _customDBConfigChecker(dbConfig);
        } catch (errMsg) {
            throw FormattedResult['PARAM_INVALID'].setData({
                desc: `${errMsg}`
            });
        }
        this.name = dbConfig.dbName;
        this.version = optionWithBackup(dbConfig.dbVersion, DEFAULT_DB_VERSION);
        this.tableList = Object.keys(dbConfig.tables || {}).map(tableName => {
            return {
                ...{ tableName: tableName },
                ...dbConfig.tables![tableName]
            };
        });
        this.itemDuration = dbConfig.itemDuration;
    }
    async addItems(items: ItemConfig[]) {
        const itemDurationOverrider = (
            ofDB: number | undefined,
            ofTable: number | undefined,
            ofItem: number | undefined
        ) => {
            if (ofItem !== undefined) {
                return ofItem;
            } else if (ofTable !== undefined) {
                return ofTable;
            } else {
                return ofDB;
            }
        };
        try {
            _customDBAddItemsParamChecker(items, this.tableList);
        } catch (errMsg) {
            throw FormattedResult['PARAM_INVALID'].setData({
                desc: `${errMsg}`
            });
        }
        try {
            // Set backup itemDuration to each item
            const itemsWithDuration = items.map(item => {
                const theTable: TableConfig = this.tableList.find(
                    table => table.tableName === item.tableName
                ) as TableConfig;
                return {
                    ...{
                        itemDuration: itemDurationOverrider(
                            this.itemDuration,
                            theTable.itemDuration,
                            item.itemDuration
                        )
                    },
                    ...item
                };
            });
            await DBWrapper.addItems(this, itemsWithDuration);
            return FormattedResult['SUCC'];
        } catch (e) {
            throw FormattedResult['ADD_ITEMS_FAIL'].setData({
                desc: `${e}`
            });
        }
    }
    async getItem(tableName: string, primaryKeyValue: any) {
        try {
            return await DBWrapper.getItem(
                this.name,
                tableName,
                primaryKeyValue
            );
        } catch (e) {
            throw FormattedResult['GET_ITEM_FAIL'].setData({
                desc: `${e}`
            });
        }
    }

    async getItemsInRange(tableIndexRange: TableIndexRange) {
        try {
            tableIndexRangeParamChecker(tableIndexRange);
        } catch (errMsg) {
            throw FormattedResult['PARAM_INVALID'].setData({
                desc: `${errMsg}`
            });
        }
        try {
            return await DBWrapper.getItemsInRange(this.name, tableIndexRange);
        } catch (e) {
            throw FormattedResult['GET_IN_RANGE_FAIL'].setData({
                desc: `${e}`
            });
        }
    }

    async deleteItemsInRange(tableIndexRanges: TableIndexRange[]) {
        try {
            paramChecker(
                tableIndexRanges,
                ParamCheckerEnum.Array,
                'tableIndexRanges',
                !OPTIONAL
            );
            tableIndexRanges.forEach(tableIndexRange => {
                tableIndexRangeParamChecker(tableIndexRange);
            });
        } catch (errMsg) {
            throw FormattedResult['PARAM_INVALID'].setData({
                desc: `${errMsg}`
            });
        }
        try {
            await DBWrapper.deleteItems(this.name, tableIndexRanges);
            return FormattedResult['SUCC'];
        } catch (e) {
            throw FormattedResult['DELETE_ITEMS_FAIL'].setData({
                desc: `${e}`
            });
        }
    }
}

export async function deleteDB(dbName: string) {
    try {
        paramChecker(dbName, ParamCheckerEnum.String, 'dbName', !OPTIONAL);
    } catch (errMsg) {
        throw FormattedResult['PARAM_INVALID'].setData({
            desc: `${errMsg}`
        });
    }
    try {
        await DBWrapper.deleteDB(dbName);
        return FormattedResult['SUCC'];
    } catch (e) {
        throw FormattedResult['DELETE_DB_FAIL'].setData({
            desc: `${e}`
        });
    }
}
export default {
    idbIsSupported,
    CustomDB,
    deleteDB
};
