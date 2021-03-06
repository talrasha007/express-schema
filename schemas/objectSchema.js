var _ = require('underscore'),
    util = require('util'),
    cm = require('./common.js');

var ObjectSchema = exports.ObjectSchema = function (obj) {
    if (!(this instanceof ObjectSchema)) return new ObjectSchema(obj);

    cm.SchemaBase.call(this);
    if (obj instanceof ObjectSchema) obj = obj.schemas;

    var os = this.schemas = {};
    _.each(obj, function (desc, field) {
        if (desc instanceof cm.SchemaBase) {
            os[field] = desc;
        } else if (_.isArray(desc)) {
            os[field] = new ArraySchema(desc);
        } else if (_.isObject(desc)) {
            os[field] = new ObjectSchema(desc);
        }
    });
};

util.inherits(ObjectSchema, cm.SchemaBase);
_.extend(ObjectSchema.prototype, {
    isObject: true,

    parse: function (obj) {
        var ret =
            _.reduce(this.schemas, function (m, schema, field) {
                try {
                    var v = schema.parse(obj && obj[field]);
                    if (v !== undefined) m[field] = v;
                    return m;
                } catch (e) {
                    e.path = field + (e.path && ('.' + e.path));
                    throw e;
                }
            }, {});

        if (_.isEmpty(ret)) return ;
        else return ret;
    }
});

var ArraySchema = exports.ArraySchema = function (arr) {
    if (!(this instanceof ArraySchema)) return new ArraySchema(arr);

    if (arr instanceof ArraySchema) arr = [arr._schema];
    if (!_.isArray(arr) || arr.length > 1) throw new Error('Wrong array schema parameter.');

    cm.SchemaBase.call(this);

    if (arr[0] instanceof cm.SchemaBase) {
        this._schema = arr[0];
    } else if (_.isArray(arr[0])) {
        this._schema = new ArraySchema(arr[0]);
    } else if (_.isObject(arr[0])) {
        this._schema = new ObjectSchema(arr[0]);
    }
};

util.inherits(ArraySchema, cm.SchemaBase);
_.extend(ArraySchema.prototype, {
    isArray: true,

    parse: function (arr) {
        if (!arr) return ;
        if (!_.isArray(arr)) throw new cm.SchemaParseError('should be an array.');

        var me = this,
            ret = _.reduce(arr, function (m, val) {
                if (!me._schema) {
                    m.push(val);
                } else {
                    if (me._schema.isObject && _.isString(val)) {
                        try { val = JSON.parse(val); }
                        catch (e) {}
                    }
                    var v = me._schema.parse(val);
                    if (v !== undefined) m.push(v);
                }

                return m;
            }, []);

        if (ret.length > 0) return ret;
        else return ;
    },

    required: function () {
        return this._sealParser(function (v) {
            if (v && v.length > 0) return (v);
            throw new cm.SchemaParseError('required.');
        });
    },

    len: function (min, max) {
        return this._sealParser(function (v) {
            if (v && v.length >= (min || 0) && (max === undefined || v.length <= max)) return v;
            throw new cm.SchemaParseError('array length error.');
        });
    }
});
