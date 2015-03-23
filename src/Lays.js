var TypeUtil = require('./Utils/TypeUtil.js');
var ObjectUtil = require('./Utils/ObjectUtil.js');
var Handler = require('./Handler.js');
var fs = require('fs');
var path = require('path');
var journey = require('journey');
var cluster = require('cluster');
var http = require("http");
var numCPUs = require('os').cpus().length;

module.exports = (function(){
    // Lays
    var Lays = {};

    // 项目实际路径
    var prjPath = path.dirname(module.parent.filename);

    /**
     * 启动服务
     * @param configOrPath  Configuration object or File path of configuration
     */
    Lays.run = function(configOrPath){
        if (cluster.isMaster)
        {
            var _config = loadConfig(configOrPath);

            var _useCPUs = _config.CPU;
            _useCPUs = _useCPUs > 0 && _useCPUs <= numCPUs ? _useCPUs : numCPUs;
            for (var i = 0; i < numCPUs; i++)
            {
                var wk = cluster.fork();
                _config.RouterMap = _config.RouterMap.toString();
                wk.send(_config);
            }

            cluster.on('listening', function(worker, address){
                // 调试 "监听线程启动"
                console.log("服务启动成功 pid:" + worker.process.pid + ",host:" + address.address + ",port:" + address.port);
            });

            cluster.on('exit', function(){
                console.warn("线程因错误退出，已重启线程");
                cluster.fork();
            });
        }
        else
        {
            listen();
        }
    };

    function loadConfig(configOrPath)
    {
        // 默认配置
        var _defConfig = {
            CPU:0,
            RouterMap:/\/(\w*\W*\w*)*/,
            DefType:['get', 'post'],
            Server:{
                Host:0,
                Port:15015
            },
            Path:{
                Config:'config',
                Service:'service',
                Interceptor:'interceptor'
            }
        };

        var _config;

        // 如果是文件
        if (TypeUtil.isString(configOrPath))
        {
            var _fileConf = 0;
            try
            {
                _fileConf = JSON.parse(fs.readFileSync(getActualPath(configOrPath)));
            }
            catch (e)
            {
                if (e.errno == 34)
                {
                    // 警告 "配置文件路径异常，已启用默认配置！"
                    console.warn("配置文件路径异常，已启用默认配置！");
                }
                else
                {
                    // 警告 "配置文件格式异常，已启用默认配置！"
                    console.warn("配置文件格式异常，已启用默认配置！");
                }

            }

            // 加载用户配置
            if (_fileConf)
                _config = _fileConf;
        }
        else if (TypeUtil.isObject(configOrPath))
            _config = configOrPath;

        // 覆盖默认配置
        _config = _config ? ObjectUtil.cover(_defConfig, _config) : _defConfig;

        // 写入项目根路径
        _config.Path.Root = prjPath;
        return _config;
    }

    function listen()
    {
        process.on('message', function(config){
            var _router = new journey.Router();
            config.RouterMap = eval(config.RouterMap);

            if (TypeUtil.isFunction(config.RouterMap))
                _router.map(config.RouterMap);
            else
            {
                _router.map(function(){
                    this.get(config.RouterMap).bind(function(req, res, path, params){
                        handler(config, 'get', req, res, params);
                    });

                    this.post(config.RouterMap).bind(function(req, res, params){
                        handler(config, 'post', req, res, params);
                    });

                    this.put(config.RouterMap).bind(function(req, res, params){
                        handler(config, 'put', req, res, params);
                    });

                    this.del(config.RouterMap).bind(function(req, res, params){
                        handler(config, 'delete', req, res, params);
                    });
                });

                var _server = http.createServer(function(req, res){
                    var body = "";
                    req.addListener('data', function(chunk){
                        body += chunk;
                    });
                    req.addListener('end', function(){
                        _router.handle(req, body, function(result){
                            res.writeHead(result.status, result.headers);
                            res.end(result.body);
                        });
                    });
                });

                try
                {
                    config.Server.Host ? _server.listen(config.Server.Port, config.Server.Host) : _server.listen(config.Server.Port);
                }
                catch (e)
                {
                    // 错误 "启动服务失败，请检查 Config.Server 配置是否正确"
                    console.error("启动服务失败，请检查 Config.Server 配置是否正确");
                }
            }
        });
    }

    function handler(config, type, req, res, params)
    {
        new Handler(config, type, req, res, params);
    }

    function getActualPath()
    {
        return path.join(prjPath, path.join.apply(this, arguments));
    }


    return Lays;
})();