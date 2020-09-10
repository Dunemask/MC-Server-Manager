const mgr = require('./mcmanager');
let jarList=mgr.updateJarList();
let pluginsList=mgr.updatePluginsList();
function sayHello(){
  console.log(ramInUse);
}

function dynamicUpdate(element,items){
  for(let key in items){
    element.innerHTML = element.innerHTML.replace('${'+key+'}',items[key]);
  }
}

const ramUsageHeader = document.getElementById('ramUsage');
const createPageLink = document.getElementById('createPage');
const overviewConsole = document.getElementById('overviewConsole');

dynamicUpdate(ramUsageHeader,{0:global.ramInUse,1:global.db.ramCapacity});

if(global.serverInstances.length==0){
  liveServers.innerHTML='<h3>No Servers Running</h3>'
}else{

}

if(global.db.servers.length==0){
  databaseServers.innerHTML='<h3>No Servers Found '+createPageLink.innerHTML+'</h3>';
}else{

}
