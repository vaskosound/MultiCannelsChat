/// <reference path="controller.js" />
/// <reference path="dataAccess.js" />
(function () {
    //var serviceRoot = "http://multichannelschat.apphb.com/api/";
    var serviceRoot = "http://localhost:16502/api/";
    
    var persister = Chat.persisters.get(serviceRoot);

    var controller = Chat.controller.get(persister);
    controller.loadUI("#body");
    
}());