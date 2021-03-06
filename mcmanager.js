const {shell} = require('electron')
const fs = require('fs');
const child_process = require('child_process');
const tk = require('tree-kill');
const homedir = require('os').homedir();
const path = require('path');
const rimraf = require("rimraf");
//Define Constants
const resourcesLocation = path.join(homedir+'/mcservermanager/');
const management = resourcesLocation+'server-manager/';
const dbLocation = resourcesLocation+'database.json';
const instanceLock = resourcesLocation+'instance-lock.json';
const serverLocation = management+'servers/';
const pluginsLocation = management+'plugins/';
const jarsLocation = management+'jars/';
initializeBackend();
//Setup DB
global.db = readDB();
global.instancelock = readInstanceLock();
function readInstanceLock(){
  return JSON.parse(fs.readFileSync(instanceLock));
}

function readDB(){
  return JSON.parse(fs.readFileSync(dbLocation));
}
function updateDB(){
  let data=JSON.stringify(global.db,null,1);
  fs.writeFileSync(dbLocation, data);
}
function updateInstanceLock(){
  if(global.instancelock.serverInstances.length==0){
    global.instancelock.ramInUse=0;
  }
  fs.writeFileSync(instanceLock, JSON.stringify(global.instancelock,null,1));
}

function updatePluginsList(){
  let pluginsList = [];
  filenames = fs.readdirSync(pluginsLocation);
  filenames.forEach(file => {
      pluginsList.push(file);
  });
return pluginsList;
}
function removeRunningInstance(name){
  for(let i in global.instancelock.serverInstances){
    if(global.instancelock.serverInstances[i].server.name==name){
      global.instancelock.serverInstances.splice(i, 1);
    }
  }
  updateInstanceLock();
}

function updateJarList(){
  let jarList = [];
  filenames = fs.readdirSync(jarsLocation);
  filenames.forEach(file => {
    if(file!='BuildTools.jar' && file.includes('.jar')){
      jarList.push(file);
    }

  });

return jarList;
}
function createWorld(name,ram,jar,plugins){
  //Check for Duplicates
  for(i in global.db.servers){
    if(global.db.servers[i].name==name){
      return false;
    }
  }
  //Create Server
  db['servers'].push(
      {
      "name":name,
      "ram":ram,
      "jar":jar,
      "plugins":plugins
    })
    return true;
}
function deleteWorld(name,deleteFiles){ //TODO
  for(i in global.db.servers){
    if(global.db.servers[i].name==name){
      global.db.servers.splice(i, 1);
      break;
    }
  }
  if(deleteFiles){
    rimraf.sync(`${serverLocation}${name}`);
  }
}

function stopAllWorlds(){
  for(let i in global.instancelock.serverInstances){
    let pid = global.instancelock.serverInstances[i].process.pid;
    tk(pid); //Tree KIll
    removeRunningInstance(global.instancelock.serverInstances[i].server.name);
  }
  global.instancelock.ramInUse=0;
}

function stopWorld(name){
  for(i in global.instancelock.serverInstances){
    if(global.instancelock.serverInstances[i].server.name==name){
      let pid = global.instancelock.serverInstances[i].process.pid;
      tk(pid); //Tree KIll
      global.instancelock.ramInUse= parseInt(global.instancelock.ramInUse)-parseInt(global.instancelock.serverInstances[i].server.ram);
      global.instancelock.ramInUse = global.instancelock.ramInUse<0? 0:global.instancelock.ramInUse;
      removeRunningInstance(name);
      return true;
    }
  }

  return false;

}

function openSettings(){
  shell.openPath(dbLocation);
}

function openSystemFolder(){
  shell.openPath(resourcesLocation);
}
function openJarsFolder(){
  shell.openPath(jarsLocation);
}

function openWorld(serverName){
  console.log(serverLocation+serverName);
  if(fs.existsSync(serverLocation+serverName)){
    shell.openPath(serverLocation+serverName);
  }else{
  }
}

function updateServer(server){
  for(s in global.db.servers){
    if(global.db.servers[s].name==server.name){
      global.db.servers[s]=server;
      updateDB();
      return;
    }
  }
  return true;
}

function openServerProvider(){
  shell.openExternal(`https://mcversions.net/`)
}
function startWorld(name){
  let server;
  for(i in global.db.servers){
    if(global.db.servers[i].name==name){
      server=global.db.servers[i];
      break;
    }
  }
  if(!server){
    return 'ERROR: Server Not Found!';}
  if(parseInt(server.ram)+parseInt(global.instancelock.ramInUse)>global.db.ramCapacity){
    return 'ERROR: Launching a new Instance Uses Too Much Ram!'
  }

  let serverDir=serverLocation+`${name}/`
  if(!fs.existsSync(serverDir)){
    fs.mkdirSync(serverDir);
    if(!fs.existsSync(`${serverDir}eula.txt`)){
      fs.copyFileSync(resourcesLocation+`default_eula.txt`, `${serverDir}eula.txt`,fs.constants.COPYFILE_EXCL);
    }
    if(!fs.existsSync(`${serverDir}ops.json`)){
      fs.copyFileSync(resourcesLocation+`default_ops.json`, `${serverDir}ops.json`,fs.constants.COPYFILE_EXCL);
    }
    fs.copyFileSync(`${jarsLocation}${server.jar}`, `${serverDir}${server.jar}`,fs.constants.COPYFILE_EXCL);
  }
  //Plugins Remove all and Recopy
  fs.rmdirSync(`${serverDir}plugins/`, { recursive: true }, (err) => {
    if (err) {
        throw err;
    }
  });
  fs.rmdirSync(`${serverDir}mods/`, { recursive: true }, (err) => {
    if (err) {
        throw err;
    }
  });
  fs.mkdirSync(`${serverDir}plugins/`);
  fs.mkdirSync(`${serverDir}mods/`);
  for(i in server.plugins){
      fs.copyFileSync(`${pluginsLocation}${server.plugins[i]}`, `${serverDir}plugins/${server.plugins[i]}`,fs.constants.COPYFILE_EXCL);
      fs.copyFileSync(`${pluginsLocation}${server.plugins[i]}`, `${serverDir}mods/${server.plugins[i]}`,fs.constants.COPYFILE_EXCL);
  }
  //Jar Setup
  if(!fs.existsSync(`${serverDir}${server.jar}`)){
    fs.copyFileSync(`${jarsLocation}${server.jar}`, `${serverDir}${server.jar}`,fs.constants.COPYFILE_EXCL);
  }
  let command=`${db.javaPath} -Xmx${server.ram}M -Xms${server.ram}M -jar ${server.jar} nogui`;
  let cp=child_process.exec(command,{cwd:`${serverDir}`,detached: true});
/*  cp.stdout.on('data', (data) => {
  console.log(`child stdout:\n${data}`);
});*/
  /*cp.stderr.on('data', (data) => {
  console.log(`child stderr:\n${data}`);
});*/
cp.addListener('close', (evt) =>{
  console.log('Closed!');
  removeRunningInstance(name);
});
  global.instancelock.serverInstances.push({ server:server,process:cp});
  if(global.instancelock.ramInUse==null){
    global.instancelock.ramInUse=0;
  }
  global.instancelock.ramInUse=parseInt(server.ram)+parseInt(global.instancelock.ramInUse);
  updateInstanceLock();
  return 'started';
}
function initializeBackend(){
  if(!fs.existsSync(resourcesLocation)){
    fs.mkdirSync(resourcesLocation);
    fs.writeFileSync(resourcesLocation+`default_ops.json`, '[]');
    fs.writeFileSync(resourcesLocation+`default_eula.txt`, 'eula=true');
  }
  if(!fs.existsSync(dbLocation)){
    fs.writeFileSync(dbLocation,JSON.stringify({
                   "ramCapacity": "8192",
                   "defaultRamAllocation": "2048",
                   "javaPath": "java",
                   "servers": []
                 },null,1));
  }
  if(!fs.existsSync(instanceLock)){
    fs.writeFileSync(instanceLock,'{"ramInUse": 0,"serverInstances":[]}');
  }

  if(!fs.existsSync(management)){
    fs.mkdirSync(management);
  }
  if(!fs.existsSync(serverLocation)){
    fs.mkdirSync(serverLocation);}
  if(!fs.existsSync(jarsLocation)){
    fs.mkdirSync(jarsLocation);}
  if(!fs.existsSync(pluginsLocation)){
    fs.mkdirSync(pluginsLocation);}
  updateJarList();
  updatePluginsList();
}
exports.updateDatabase = updateDB;
exports.updateInstanceLock = updateInstanceLock;
exports.readDatabase=readDB;
exports.updateJarList = updateJarList;
exports.updatePluginsList = updatePluginsList;
exports.updateServer = updateServer;
exports.createWorld = createWorld;
exports.deleteWorld = deleteWorld;
exports.stopWorld=stopWorld;
exports.stopAllWorlds=stopAllWorlds;
exports.startWorld=startWorld;
exports.openWorld=openWorld;
exports.removeRunningInstance=removeRunningInstance;
exports.openSettings=openSettings;
exports.openSystemFolder=openSystemFolder;
exports.openJarsFolder=openJarsFolder;
exports.openServerProvider=openServerProvider;
