// Import authored catalog text only. Never imports Firebase config, accounts or assets.
import fs from 'node:fs';
const source=fs.readFileSync('C:/งานอาจารย์นาราศักดิ์/lifequestmvp/lifequest/lib/core/constants/adventure_catalog.dart','utf8');
const blocks=source.split(/\n  _adventure\(/).slice(1);
const field=(text,name)=>text.match(new RegExp(`${name}: '([^']*)'`))?.[1];
const catalog=blocks.map(block=>({id:field(block,'id'),category:block.match(/pathType: PathType\.(\w+)/)?.[1],title:field(block,'name'),englishTitle:field(block,'englishName'),description:field(block,'description'),tasks:block.split(/\n      _quest\(/).slice(1).map(task=>({id:field(task,'id'),title:field(task,'title'),description:field(task,'description')}))})).filter(x=>x.id&&x.title);
if(catalog.length!==12)throw Error('Unexpected LifeQuest catalog shape');
fs.mkdirSync('src/features/careers',{recursive:true});
fs.writeFileSync('src/features/careers/catalog.json',JSON.stringify(catalog,null,2)+'\n');
console.log(`Imported ${catalog.length} paths, ${catalog.reduce((n,x)=>n+x.tasks.length,0)} suggested tasks`);
