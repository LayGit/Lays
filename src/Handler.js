var TypeUtil = require('./Utils/TypeUtil.js');
var ObjectUtil = require('./Utils/ObjectUtil.js');
var path = require('path');
var vm = require('vm');
var fs = require('fs');

module.exports = (function()
{
    var Lays = function(config, type, req, res, params)
    {
        this.config = config;
        this.type = type;
        this.request = req;
        this.response = res;
        this.params = params;

        // 请求路径
        var _urlPath = req.url.pathname;

        // 接口路径拼装
        var _infPath = path.join(config.Path.Root, config.Path.Service, _urlPath + ".js");

        // 传入沙箱对象
        var sandbox = {
            include:this.include,
            Lays:this
        };

        var that = this;
        fs.exists(_infPath, function(exsist)
        {
            if (exsist)
            {
                fs.readFile(_infPath, function(err, data)
                {
                    // 进入沙箱执行
                    vm.runInNewContext(data, sandbox, 'interface.vm');
                });
            }
            else
            {
                // 错误 "未找到接口文件"
                console.error("未找到接口文件");
                that.return({message:'错误的请求'});
            }
        });
    };

    /**
     * 获取项目配置文件
     * @type {getConfig}
     */
    Lays.prototype.getConfig = function(confName)
    {
        confName = /\.json$/.test(confName.toLowerCase()) ? confName : confName + ".json";
        var _confPath = path.join(this.config.Path.Root, this.config.Path.Config, confName);
        try
        {
            return JSON.parse(fs.readFileSync(_confPath, 'utf-8'));
        }
        catch (e)
        {
            // 错误 配置文件载入失败
            console.error("配置文件载入失败");
        }
    };

    /**
     * 引用相对于项目根路径的模块
     * @param module
     * @returns {*}
     */
    Lays.prototype.include = function(module)
    {
        try{
            return require(module);
        }
        catch (e){
            return require(path.join(this.config.Path.Root, module));
        }
    };

    /**
     * 接口定义
     * @param options
     * @param handler
     */
    Lays.prototype.service = function(options, handler)
    {
        var _defOptions = {
            type:['get'],
            interceptor:[]
        };

        var that = this;

        if (TypeUtil.isObject(options))
        {
            options = ObjectUtil.cover(_defOptions, options);
        }

        if (TypeUtil.isFunction(options) && arguments.length == 1)
        {
            handler = options;
            options = _defOptions;
        }

        // 请求类型分析

        if (options.type.indexOf(that.type) > -1)
            execute();
        else
        {
            // 错误的请求
            that.return({message:'错误的请求'});
        }

        function execute()
        {
            // 分析拦截器
            if (TypeUtil.isString(options.interceptor))
                options.interceptor = [options.interceptor];
            if (TypeUtil.isArray(options.interceptor) && options.interceptor.length > 0)
                doInterceptor(0);
            else
                handler.apply({}, []);

            function doInterceptor(i)
            {
                var _iPath = path.join(that.config.Path.Root, that.config.Path.Interceptor, options.interceptor[i] + ".js");
                fs.exists(_iPath, function(isExsist){
                    if (isExsist)
                    {
                        var _done = function(){
                            if (i == options.interceptor.length - 1)
                                handler.apply({}, []);
                            else
                                doInterceptor(++i);
                        };
                        fs.readFile(_iPath, function(err, data){
                            var sandbox = {
                                include:this.include,
                                Lays: that,
                                Done:_done
                            };
                            // 进入沙箱执行
                            vm.runInNewContext(data, sandbox, 'interceptor.vm');
                            that.params = sandbox.Lays.params;
                        });
                    }
                    else
                    {
                        // 错误 "未找到拦截器文件"
                        console.error("未找到拦截器文件");
                        that.return({message:'内部错误'});
                    }
                });
            }
        }
    };

    Lays.prototype.interceptor = function(handler){
        handler.apply({}, []);
    };

    Lays.prototype.return = function(result, type, charset)
    {
        var _header = {};

        // 默认json格式
        if (!type)
            type = 'json';

        switch (type)
        {
            case 'text':
                _header['Content-Type'] = 'text/plain';
                break;
            case 'json':
                result = JSON.stringify(result);
                _header['Content-Type'] = 'application/json';
                break;
            case 'xml':
                _header['Content-Type'] = 'text/xml';
                break;
            case 'html':
                _header['Content-Type'] = 'text/html';
                break;
            case 'css':
                _header['Content-Type'] = 'text/css';
                break;
            case 'js':
                _header['Content-Type'] = 'text/javascript';
                break;
            default :
                _header['Content-Type'] = type;
                break;
        }

        charset = charset ? charset : 'UTF-8';
        _header['Content-Type'] += ';charset=' + charset;
        this.response.send(200, _header, result);
    };

    return Lays;
})();