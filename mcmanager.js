const fs = require('fs');
const shell = require('shelljs');
const child_process = require('child_process');
const tk = require('tree-kill');
//Define Constants
const dbLocation = 'database.json';
const serverLocation = 'server-manager/servers/';
const pluginsLocation = 'server-manager/plugins/';
const jarsLocation = 'server-manager/jars/';
const openExplorer = require('open-file-explorer');
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
  for(let i in global.serverInstances){
    if(global.serverInstances[i].server.name==name){
      global.serverInstances.splice(i, 1);
    }
  }
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
    console.log("Would Remove World Files")
  }
}
function stopWorld(name){
  for(i in global.serverInstances){
    if(global.serverInstances[i].server.name==name){
      let pid = global.serverInstances[i].process.pid;
      tk(pid); //Tree KIll
      global.ramInUse-= parseInt(global.serverInstances[i].server.ram);
      global.ramInUse = global.ramInUse>0? 0:global.ramInUse;
      removeRunningInstance(name);
      return true;
    }
  }

  return false;

}

function openWorld(server){
  if(fs.existsSync(serverLocation+server.name)){
    openExplorer(serverLocation+server.namename, err => {
      if(err) {
          console.log(err);
      }
      else {
          console.log('Gucci?');
      }
  });
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
  if(parseInt(server.ram)+global.ramInUse>global.db.ramCapacity){
    return 'Launching a new Instance Uses Too Much Ram!'
  }

  let serverDir=serverLocation+`${name}/`
  if(!fs.existsSync(serverDir)){
    fs.mkdirSync(serverDir);
    if(!fs.existsSync(`${serverDir}eula.txt`)){
      fs.copyFileSync(`server-manager/default_eula.txt`, `${serverDir}eula.txt`,fs.constants.COPYFILE_EXCL);
    }
    if(!fs.existsSync(`${serverDir}ops.json`)){
      fs.copyFileSync(`server-manager/default_ops.json`, `${serverDir}ops.json`,fs.constants.COPYFILE_EXCL);
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
  global.serverInstances.push({ server:server,process:cp});
  global.ramInUse+=parseInt(server.ram);
  return 'started';
}
function initializeBackend(){
  if(!fs.existsSync('server-manager/')){
    fs.mkdirSync('server-manager/');}
  if(!fs.existsSync(serverLocation)){
    fs.mkdirSync(serverLocation);}
  if(!fs.existsSync(jarsLocation)){
    fs.mkdirSync(jarsLocation);}
  if(!fs.existsSync(pluginsLocation)){
    fs.mkdirSync(pluginsLocation);}
  updateJarList();
  updatePluginsList();
}
initializeBackend();
exports.updateDatabase = updateDB;
exports.readDatabase=readDB;
exports.updateJarList = updateJarList;
exports.updatePluginsList = updatePluginsList;
exports.updateServer = updateServer;
exports.createWorld = createWorld;
exports.deleteWorld = deleteWorld;
exports.stopWorld=stopWorld;
exports.startWorld=startWorld;
exports.openWorld=openWorld;
exports.removeRunningInstance=removeRunningInstance;