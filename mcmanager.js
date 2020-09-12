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
const serverLocation = management+'servers/';
const pluginsLocation = management+'plugins/';
const jarsLocation = management+'jars/';
initializeBackend();
//Setup DB
global.db = readDB();
function readDB(){
  return JSON.parse(fs.readFileSync(dbLocation));
}
function updateDB(){
  let data=JSON.stringify(db,null,1);
  fs.writeFileSync(dbLocation, data);
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
  for(let i in global.db.serverInstances){
    if(global.db.serverInstances[i].server.name==name){
      global.db.serverInstances.splice(i, 1);
    }
  }
  updateDB();
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
  for(let i in global.db.serverInstances){
    let pid = global.db.serverInstances[i].process.pid;
    tk(pid); //Tree KIll
    global.db.ramInUse= parseInt(global.db.ramInUse)-parseInt(global.db.serverInstances[i].server.ram);
    global.db.ramInUse = global.db.ramInUse>0? 0:global.db.ramInUse;
    removeRunningInstance(global.db.serverInstances[i].server.name);
  }
}

function stopWorld(name){
  for(i in global.db.serverInstances){
    if(global.db.serverInstances[i].server.name==name){
      let pid = global.db.serverInstances[i].process.pid;
      tk(pid); //Tree KIll
      global.db.ramInUse= parseInt(global.db.ramInUse)-parseInt(global.db.serverInstances[i].server.ram);
      global.db.ramInUse = global.db.ramInUse>0? 0:global.db.ramInUse;
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
function startWorld(name){
  let server;
  for(i in global.db.servers){
    if(global.db.servers[i].name==name){
      server=global.db.servers[i];
      break;
    }
  }
  if(!server){
    return 'Server Not Found!';}
  if(parseInt(server.ram)+parseInt(global.db.ramInUse)>global.db.ramCapacity){
    return 'Launching a new Instance Uses Too Much Ram!'
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
  global.db.serverInstances.push({ server:server,process:cp});
  if(global.db.ramInUse==null){
    global.db.ramInUse=0;
  }
  global.db.ramInUse=parseInt(server.ram)+parseInt(global.db.ramInUse);
  updateDB();
  return 'started';
}
function initializeBackend(){
  if(!fs.existsSync(resourcesLocation)){
    fs.mkdirSync(resourcesLocation);
    fs.writeFileSync(resourcesLocation+`default_ops.json`, '[]');
    fs.writeFileSync(resourcesLocation+`default_eula.txt`, 'eula=true');
    fs.writeFileSync(dbLocation,JSON.stringify({
                   "username": "admin",
                   "password": "password",
                   "ramCapacity": "8192",
                   "defaultRamAllocation": "2048",
                   "javaPath": "java",
                   "servers": [],
                   "serverInstances": [],
                   "ramInUse": 0
                 },null,1))
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
