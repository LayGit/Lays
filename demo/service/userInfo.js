Lays.service({
    type:['get'],
    interceptor:['auth']
}, function()
{
    var params = Lays.params;
    var userId = params.userId;

    var userObj = Lays.getConfig("user");
    var user = userObj[userId.toString()];

    if (user)
        Lays.return({code:0, data:user, message:''});
    else
        Lays.return({code:102, data:{}, message:'用户不存在'});
});