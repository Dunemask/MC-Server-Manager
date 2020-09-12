const mgr = require('./mcmanager');
const emptyRamString = 'Total Ram ${0}/${1}';
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
     modSelector+=`<input type="checkbox" id="${server.name}-plugin-${pluginsList[plugin]}" name="${server.name}-plugin-${pluginsList[plugin]}" class="${pluginsList[plugin]}"`;
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
function loadContent(content,forceReload){
  overviewConsole.style.display="none";
  createPage.style.display="none";
  globalSettings.style.display="none";
  ramUsageHeader.innerHTML=emptyRamString;
  dynamicUpdate(ramUsageHeader,{0:global.ramInUse,1:global.db.ramCapacity});
  //overviewConsole content;
  if(content=='overview'){
    loadOverview(forceReload);
    addListeners();
    overviewConsole.style.display="block";
  }else if(content=="createPage"){
    loadCreate();
    createPage.style.display="block";
  }
}

function loadOverviewServer(server,openSettings){
  let serverContent = `<li><div class="databaseServer" id="serverOptions-${server.name}">`
  serverContent+=`<h2>${server.name}</h2>`
  serverContent+='<div class="serverEvents"><ul>'
  serverContent+=`<li><button onclick="startWorld('${server.name}')">Start</button></li>`
  serverContent+=`<li><button onclick="mgr.openWorld('${server.name}')">Show Files</button></li>`
  serverContent+=`<li><button onclick="deleteWorld('${server.name}')">Delete</button></li>`
  serverContent+=`<li><button class="serverSettingsTrigger">Settings</button></li>`
  serverContent+='</ul></div>'
  serverContent+='<div class="serverSettings"';
  if(openSettings){
    serverContent+='style="display:block"';
  }
  serverContent+='><h3>Ram</h3>'
  serverContent+=ramOption(server);
  serverContent+='<h3>Version</h3>'
  serverContent+=jarSelector(server);
  serverContent+='<div class="pluginSelector">'
  serverContent+='<h3>Plugins/Mods</h3>'
  serverContent+=pluginsSelector(server);
  serverContent+='</div>'
  serverContent+=`<button class="saveServerChanges" disabled>Save</button>`
  serverContent+=`<button class="discardServerChanges" disabled>Discard</button>`
  serverContent+='</div>'
  serverContent+= '</li></div>'
  return serverContent;
}
function loadOverview(forceReload){
  //Running Instance Render
  if(global.serverInstances.length==0){
    liveServers.innerHTML='<h3>No Servers Running</h3>'
  }else{
    let serverInstances =``
    for(let i in global.serverInstances){
      let instance = '<div class="serverInstance"'
      let server = global.serverInstances[i].server;
      instance+=`<h2>${server.name}</h2>`
      instance+=`<button class="stopWorldButton" onclick="stopWorld('${server.name}')">Stop</button>`
      instance+=`<h3>Ram ${server.ram}MB</h3>`
      instance+='</div>'
      serverInstances+=instance;
    }
    liveServers.innerHTML=serverInstances;
  }
  let discardButtons = document.querySelectorAll('.discardServerChanges');
  //Database Server Render
  if(global.db.servers.length==0){
    databaseServers.innerHTML='<h3>No Servers Found '+createLink.innerHTML+'</h3>';
  }else if(discardButtons.length==0||forceReload){
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
    let dbServers = '<ul>';
    //Add All Servers Using Formula in loadOverviewServer(server);
    //If the discard button is selected, we know that server has been edited and shouldn't be remade
    for(let s in servers){
      dbServers+=loadOverviewServer(servers[s]);
    }
    dbServers+='</ul>'
    databaseServers.innerHTML=dbServers;
  }else{
    let headers = document.querySelectorAll('.databaseServer > h2');
    for(let h in headers){
      for(let s in global.serverInstances){
        if(headers[h] instanceof Element && headers[h].innerHTML==global.serverInstances[s].server.name){
          headers[h].closest('.databaseServer').parentElement.remove();
        }
      }

    }
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
  let headers = document.querySelectorAll('.databaseServer > h2');
  for(let h in headers){
    if(headers[h] instanceof Element && headers[h].innerHTML==name){
      headers[h].closest('.databaseServer').parentElement.remove();
    }
  }
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
  document.getElementById('createName').addEventListener('input',function(){
    document.getElementById('createWorldButton').disabled= serverNameTaken(document.getElementById('createName').value)
  });
  createPage.querySelector('input[name=ramSelector]').addEventListener('input',function(){
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
  loadContent('overview',true);
}
function addListeners(){
  let settingsTriggerButtons = document.getElementsByClassName('serverSettingsTrigger');
  for(let b in settingsTriggerButtons){
    if(settingsTriggerButtons[b] instanceof Element){
      settingsTriggerButtons[b].onclick = function(){
        let hiddenSettings=settingsTriggerButtons[b].closest('.databaseServer').getElementsByClassName('serverSettings')[0]
        hiddenSettings.style.display= hiddenSettings.style.display=='block'?'none':'block';
      }
    }
  }
  let settingsPanels = document.getElementsByClassName('serverSettings');
  let ramTmp = 0;
  let ramInput;
  let settingsSaveButton;
  let settingsDiscardButton;
  let jarSelector;
  let pluginsSelector;
  let plugin;
  for(let s in settingsPanels){
    if(settingsPanels[s].children){
      ramInput = settingsPanels[s].querySelector('input[name=ramSelector]');
      jarSelector = settingsPanels[s].querySelector('select');
      pluginsSelector = settingsPanels[s].querySelectorAll('.pluginSelector > ul > li');
      settingsSaveButton = settingsPanels[s].querySelector('.saveServerChanges');
      settingsDiscardButton = settingsPanels[s].querySelector('.discardServerChanges');
      ramInput.defaultValue=ramInput.value;
      ramInput.addEventListener('input',function(){
        settingsSaveButton = settingsPanels[s].querySelector('.saveServerChanges');
        settingsDiscardButton = settingsPanels[s].querySelector('.discardServerChanges');
        ramTmp = this.value;
        settingsSaveButton.disabled = settingsSaveButton.disabled? (isNaN(ramTmp) || ramTmp==this.defaultValue):false;
        settingsDiscardButton.disabled = settingsDiscardButton.disabled? ramTmp==this.defaultValue:false;
      });
      jarSelector.defaultValue= jarSelector.options[jarSelector.selectedIndex].value;
      jarSelector.addEventListener('change',function(){
        settingsSaveButton = settingsPanels[s].querySelector('.saveServerChanges');
        settingsDiscardButton = settingsPanels[s].querySelector('.discardServerChanges');
        settingsSaveButton.disabled = settingsSaveButton.disabled? this.options[this.selectedIndex].value ==this.defaultValue:false;
        settingsDiscardButton.disabled = settingsDiscardButton.disabled? this.options[this.selectedIndex].value ==this.defaultValue:false;
      })
      for(let p in pluginsSelector){
        if(pluginsSelector[p].children)
          plugin = pluginsSelector[p].querySelector('input[type="checkbox"]');
          plugin.defaultValue=plugin.checked;
          plugin.addEventListener('change',function(){
            settingsSaveButton = settingsPanels[s].querySelector('.saveServerChanges');
            settingsDiscardButton = settingsPanels[s].querySelector('.discardServerChanges');
            settingsSaveButton.disabled = settingsDiscardButton.disabled? `${this.checked}`==this.defaultValue:false;
            settingsDiscardButton.disabled = settingsDiscardButton.disabled?`${this.checked}`==this.defaultValue:false;
          })
        }

    settingsDiscardButton.onclick=function(){
      let name =  settingsPanels[s].parentElement.querySelector('h2').innerHTML;
      this.disabled=true;
      this.parentElement.querySelector('.saveServerChanges').disabled=true;
      let oldDisplay = this.closest('.serverSettings').style.display;
      for(let s in global.db.servers){
        if(global.db.servers[s].name==name){
          this.closest('.databaseServer').parentElement.innerHTML=loadOverviewServer(global.db.servers[s],true);
          break;
        }
      }

      loadContent('overview');
    }

    settingsSaveButton.onclick = function(){
      let name =  settingsPanels[s].parentElement.querySelector('h2').innerHTML;
      let ramInput = settingsPanels[s].querySelector('input[name=ramSelector]');
      let jarSelector = settingsPanels[s].querySelector('select');
      let pluginsSelector = settingsPanels[s].querySelectorAll('.pluginSelector > ul > li');
      let ram = ramInput.value;
      let jar = jarSelector.options[jarSelector.selectedIndex].value;
      let plugins = [];
      for(let p in pluginsSelector){
        if(pluginsSelector[p].children){
          if(pluginsSelector[p].querySelector('input[type="checkbox"]').checked){
            plugins.push(pluginsSelector[p].querySelector('input[type="checkbox"]').className);
          }
        }
      }
      if(isNaN(ram)){
        alert('Please ensure the ram is a number only and try again');
      }else{
        let server={name,ram,jar,plugins};
        mgr.updateServer(server);
        this.disabled=true;
        this.parentElement.querySelector('.discardServerChanges').disabled=true;
        loadContent('overview');
      }
    }

    }
  }

}

window.onbeforeunload = function(event){
  sessionStorage.setItem("serverInstances", JSON.stringify(global.serverInstances,null,1));
  sessionStorage.setItem('ramInUse',global.ramInUse);
}
loadContent('overview')
//Load Global Elements and assign event listeners
const createWorldButton = document.getElementById('createWorldButton');
