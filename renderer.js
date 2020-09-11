const mgr = require('./mcmanager');
const emptyRamString = 'Ram ${0}/${1}';
let storedServerInstances = JSON.parse(sessionStorage.getItem("serverInstances"));
let storedRamInUse = sessionStorage.getItem("ramInUse");
global.serverInstances=storedServerInstances? storedServerInstances:[];
global.ramInUse = storedRamInUse?storedRamInUse:0;
let jarList=mgr.updateJarList();
let pluginsList=mgr.updatePluginsList();
function dynamicUpdate(element,items){
  for(let key in items){
    element.innerHTML = element.innerHTML.replace('${'+key+'}',items[key]);
  }
}
const ramUsageHeader = document.getElementById('ramUsage');
//Links
const createLink = document.getElementById('createLink');
const overviewLink = document.getElementById('overviewLink');
const globalSettingsLink = document.getElementById('globalSettingsLink');
//Pages
const overviewConsole = document.getElementById('overviewConsole');
const createPage = document.getElementById('create');
const globalSettings = document.getElementById('globalSettings');
let ramOption = function(server){
  let ramValue = server?server.ram:global.db.defaultRamAllocation;
  return `<input type="text" name="ramSelector" value="${ramValue}"></input>`
}
let jarSelector = function(server){
  let versionSelector = `<select name="minecraftVersion" id="minecraftVersionSelector"`;
  if(server){
    versionSelector+= `selected="${server.version}"`
  }
  versionSelector+='>'
  jarList=mgr.updateJarList();
  for(let jar in jarList){
  versionSelector+=`<option value="${jarList[jar]}">${jarList[jar]}</option>`
  }
  versionSelector+='</select>';
  return versionSelector;
}
let pluginsSelector = function(server){
  let modSelector = '<ul>'
 pluginsList=mgr.updatePluginsList();
 if(server){
   for(let plugin in pluginsList){
     modSelector+=`<li><label for="${server.name}-plugin-${pluginsList[plugin]}">${pluginsList[plugin]}</label>`
     modSelector+=`<input type="checkbox" id="${server.name}-plugin-${pluginsList[plugin]}" name="${server.name}-plugin-${pluginsList[plugin]}"`;
     if(server.plugins.includes(pluginsList[plugin])){
       modSelector+='checked';
     }
     modSelector+='/></li>';

   }
 }else{
   for(let plugin in pluginsList){
     modSelector+=`<li><label for="create-server-plugin-${pluginsList[plugin]}">${pluginsList[plugin]}</label>`
     modSelector+=`<input type="checkbox" id="create-server-plugin-${pluginsList[plugin]}" name="create-server-plugin-${pluginsList[plugin]}"`;
     modSelector+='/></li>';
   }
 }
 modSelector+='</ul>'
 return modSelector;
}
//Reset content
function loadContent(content){
  overviewConsole.style.display="none";
  createPage.style.display="none";
  globalSettings.style.display="none";
  ramUsageHeader.innerHTML=emptyRamString;
  dynamicUpdate(ramUsageHeader,{0:global.ramInUse,1:global.db.ramCapacity});
  //overviewConsole content;
  if(content=='overview'){
    loadOverview();
    overviewConsole.style.display="block";
  }else if(content=="createPage"){
    loadCreate();
    createPage.style.display="block";
  }
}
function loadOverview(){
  //Running Instance Render
  if(global.serverInstances.length==0){
    liveServers.innerHTML='<h3>No Servers Running</h3>'
  }else{
    let serverInstances =``
    for(let i in global.serverInstances){
      let instance = '<div class="serverInstance"'
      let server = global.serverInstances[i].server;
      instance+=`<h2>${server.name}</h2>`
      instance+=`<button onclick="stopWorld('${server.name}')">Stop</button>`
      instance+=`<h3>Ram ${server.ram}MB</h3>`
      instance+='</div>'
      serverInstances+=instance;
    }
    liveServers.innerHTML=serverInstances;
  }
  //Database Server Render
  if(global.db.servers.length==0){
    databaseServers.innerHTML='<h3>No Servers Found '+createLink.innerHTML+'</h3>';
  }else{
    let dbServers = '<ul>';
    //Create local copy of servers we can adjust
    let servers = []
    for(let s in global.db.servers){
      servers.push(global.db.servers[s])
    }
    //Remove all duplicates of the running instances
    for(let i in global.serverInstances){
      for(let s = servers.length-1;s>=0;s--)
      if(servers[s].name==global.serverInstances[i].server.name){
        servers.splice(s,1);
      }
    }
    for(let s in servers){
      let serverContent = `<li><div class="databaseServer" id="serverOptions-${servers[s].name}">`
      serverContent+=`<h2>${servers[s].name}</h2>`
      serverContent+='<div class="serverEvents"><ul>'
      serverContent+=`<li><button onclick="startWorld('${servers[s].name}')">Start</button></li>`
      serverContent+=`<li><button onclick="mgr.openWorld('${servers[s].name}')">Show Files</button></li>`
      serverContent+=`<li><button onclick="deleteWorld('${servers[s].name}')">Delete</button></li>`
      serverContent+='</ul></div>'
      serverContent+='<button class="serverSettingsTrigger">Settings</button>'
      serverContent+='<div class="serverSettings">'
      serverContent+='<h3>Ram</h3>'
      serverContent+=ramOption(servers[s]);
      serverContent+='<h3>Version</h3>'
      serverContent+=jarSelector(servers[s]);
      serverContent+='<h3>Plugins/Mods</h3>'
      serverContent+=pluginsSelector(servers[s]);
      serverContent+='</div>'
      serverContent+= '</li></div>'
      dbServers+=serverContent;
    }
    dbServers+='</ul>'
    databaseServers.innerHTML=dbServers;
  }
}
function stopWorld(name){
  mgr.stopWorld(name);
  loadContent('overview');
}
function startWorld(name){
  mgr.startWorld(name);
  loadContent('overview');
}
function deleteWorld(name){
  mgr.deleteWorld(name);
  mgr.updateDatabase();
  loadContent('overview');
}
function loadCreate(){
  let defaultName = 'Survival';
  if(createPage.children.length==0){
    let createContent = '<h1>Create Server</h1>'
    createContent+=`<h3>Name</h3>`
    createContent+=`<input type="text" id="createName" name="createName" value="${defaultName}"></input>`
    createContent+='<h3>Ram</h3>'
    createContent+=ramOption();
    createContent+='<h3>Version</h3>'
    createContent+=jarSelector();
    createContent+='<h3>Plugins/Mods</h3>'
    createContent+=pluginsSelector();
    createContent+='<button id="createWorldButton" onclick="buildWorld()">Create</button>'
    createPage.innerHTML=createContent;
  }
  document.getElementById('createWorldButton').disabled= serverNameTaken(defaultName);
  document.getElementById('createName').addEventListener('change',function(){
    document.getElementById('createWorldButton').disabled= serverNameTaken(document.getElementById('createName').value)
  });
  createPage.querySelector('input[name=ramSelector]').addEventListener('change',function(){
    document.getElementById('createWorldButton').disabled= isNaN(createPage.querySelector('input[name=ramSelector]').value);
  });

}
function serverNameTaken(name){
  for(let s in global.db.servers){
    if(global.db.servers[s].name==name){
      return true;
    }
  }
  return false;
}
function buildWorld(){
  let name = document.getElementById('createName').value;
  if(serverNameTaken(name)){
    loadContent('createPage');
    return;
  }
  let jar = document.getElementById('minecraftVersionSelector').options[document.getElementById('minecraftVersionSelector').selectedIndex].text;
  let ram = createPage.querySelector('input[name=ramSelector]').value
  let pluginSelectorList = createPage.querySelector('ul').children;
  let plugins=[];
  for(let p in pluginSelectorList){
      if(pluginSelectorList[p].children && pluginSelectorList[p].querySelector('input').checked){
        plugins.push(pluginSelectorList[p].querySelector('input').id.replace('create-server-plugin-',''));
      }
  }
  mgr.createWorld(name,ram,jar,plugins);
  mgr.updateDatabase();
  loadContent('overview');
}

function addListeners(){

}

window.onbeforeunload = function(event){
  sessionStorage.setItem("serverInstances", JSON.stringify(global.serverInstances,null,1));
  sessionStorage.setItem('ramInUse',ramInUse);
}

loadOverview();
loadCreate();
loadContent('overview')
//Load Global Elements and assign event listeners
const createWorldButton = document.getElementById('createWorldButton');
addListeners();
