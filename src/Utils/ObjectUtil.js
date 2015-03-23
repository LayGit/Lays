var TypeUtil = require('./TypeUtil.js');
/**
 * 对象合并
 * @param tObj
 * @param fObj
 * @returns {*}
 */
function combine(tObj, fObj)
{
    tObj === undefined ? tObj = {} : 0;
    for (var k in fObj)
    {
        if (TypeUtil.isObject(fObj[k]))
            tObj[k] = combine(tObj[k], fObj[k]);
        else
            tObj[k] = fObj[k];
    }
    return tObj;
}

/**
 * 对象值覆盖
 * @param tObj
 * @param fObj
 */
function cover(tObj, fObj)
{
    for (var k in tObj)
    {
        if (fObj[k])
        {
            if (TypeUtil.isObject(tObj[k]) && TypeUtil.isObject(fObj[k]))
                cover(tObj[k], fObj[k]);
            else
                tObj[k] = fObj[k];
        }
    }
    return tObj;
}

exports.combine = combine;
exports.cover = cover;