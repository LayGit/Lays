Lays.interceptor(function(){
    var params = Lays.params;

    if (params.token == '123456')
        Done();
    else
        Lays.return({code:0, message:'登录信息已失效'});
});