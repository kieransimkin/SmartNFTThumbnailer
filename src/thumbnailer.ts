import puppeteer,{PuppeteerLaunchOptions, ConnectOptions, Browser} from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import fs from 'fs/promises'
import fssync from 'fs'
import pgCon from 'pg';
import {init as libcip54init, getMetadata, getSmartImports} from 'libcip54'
let _networkId: number | null = null;
let _pgClient: pgCon.Client | null = null;
let _browser: Browser | null = null;
let IPFS_GATEWAY: string | null = null;
let ARWEAVE_GATEWAY: string | null = null;
export const init = async (
    networkId: 'mainnet' | 'testnet',
    connection: pgCon.Client,
    ipfsGateway: string | null = null,
    arweaveGateway: string | null = null,
    puppeteerConfig: PuppeteerLaunchOptions | ConnectOptions = <PuppeteerLaunchOptions>{headless:'new'}
  ) => {
    _networkId = networkId === 'testnet' ? 0 : 1;
    _pgClient = connection;
    IPFS_GATEWAY = ipfsGateway;
    ARWEAVE_GATEWAY = arweaveGateway;
    libcip54init(networkId,connection,ipfsGateway,arweaveGateway);
    if (isLaunch(puppeteerConfig)) { 
        _browser = await puppeteer.launch(puppeteerConfig);
    } else { 
        _browser = await puppeteer.connect(puppeteerConfig);
    }
    return libcip54init(networkId,connection,ipfsGateway,arweaveGateway)
  };
  const isLaunch = (config: PuppeteerLaunchOptions | ConnectOptions): config is PuppeteerLaunchOptions =>{ 
    let result = (config as ConnectOptions).browserURL !==undefined?false:true;
    if ((config as ConnectOptions).browserWSEndpoint !==undefined) {
        result = false;
    }
    return result;
    
  }
  
const ensureInit = () => {
    if (!_pgClient || !_networkId || !_browser) throw new Error('Smart NFT Thumbnailer error - please initialize before use');
  };
export const getMetadataFromUnit = async (unit: string): Promise<{uses:{}}> => { 
    const metadata = await getMetadata(unit);
    return metadata;
}
export const getSmartImportsFromMetadata = async (unit: string, metadata?: {uses:any}) => {
    if (!metadata) metadata=await getMetadataFromUnit(unit);
    const smartImports = await getSmartImports(metadata?.uses, metadata, walletAddr, unit);   
}
export const getThumbnailFromObjects = async (width: number=640, height: number=480, smartImport: {}, metadata: {}) => { 
    ensureInit();
    const page = await _browser?.newPage();
    if (!page) return null;
    
    const recorder = new PuppeteerScreenRecorder(page,{
        fps: 24,
        videoCrf: 38,
        videoCodec: 'libx264',
        videoPreset: 'ultrafast',
        videoBitrate: 1000,
        recordDurationLimit: 5,
        aspectRatio: width+':'+height,
        videoFrame: {
            width,height

        },
        ffmpegAdditionalOptions:[
            '-movflags +faststart'
        ]
    });

    const pipeStream = fssync.createWriteStream('./output.mp4');
    pipeStream.on('error',(e)=>{
        console.error(e);
    })
    //const pipeStream = new PassThrough();
    const data = await fs.readFile('./submodules/SimpleCip54Viewer/build/index.html', { encoding: 'utf8' });
    const src = 'data:text/html,' + encodeURIComponent(data);
    
    await page.setViewport({width, height});
    
    await page.goto(src);
    await page.waitForFunction(() => document.readyState === "complete");

    await page.waitForNetworkIdle({idleTime: 1000, timeout:10000})
    await recorder.start("./output2.mp4");
    //await recorder.startStream(pipeStream);
    await page.setViewport({width, height});
    // Set screen size
    
    const binaryScreenshot = await page.screenshot({ type: 'png', encoding: 'binary' });
    await fs.writeFile('./output.png',binaryScreenshot)
    setTimeout(()=> { 
        setTimeout(()=>{
            recorder.stop();;
            //pipeStream.close();
        },5000);
    },1000)
}
export const getVideoFromObjects = async (width: number=640, height: number=480, fps: number=24, videoCrf: number=24, videoBitrate: number=1000, recordDuration: 5, smartImport: {}, metadata: {}) => { 
    ensureInit();
    const page = await _browser?.newPage();
    if (!page) return null;
    
    const recorder = new PuppeteerScreenRecorder(page,{
        fps: 24,
        videoCrf: 38,
        videoCodec: 'libx264',
        videoPreset: 'ultrafast',
        videoBitrate: 1000,
        recordDurationLimit: 5,
        aspectRatio: width+':'+height,
        videoFrame: {
            width,height

        },
        ffmpegAdditionalOptions:[
            '-movflags +faststart'
        ]
    });

    const pipeStream = fssync.createWriteStream('./output.mp4');
    pipeStream.on('error',(e)=>{
        console.error(e);
    })
    //const pipeStream = new PassThrough();
    const data = await fs.readFile('./submodules/SimpleCip54Viewer/build/index.html', { encoding: 'utf8' });
    const src = 'data:text/html,' + encodeURIComponent(data);
    
    await page.setViewport({width, height});
    
    await page.goto(src);
    await page.waitForFunction(() => document.readyState === "complete");

    await page.waitForNetworkIdle({idleTime: 1000, timeout:10000})
    await recorder.start("./output2.mp4");
    //await recorder.startStream(pipeStream);
    await page.setViewport({width, height});
    // Set screen size
    
    const binaryScreenshot = await page.screenshot({ type: 'png', encoding: 'binary' });
    await fs.writeFile('./output.png',binaryScreenshot)
    setTimeout(()=> { 
        setTimeout(()=>{
            recorder.stop();
            //pipeStream.close();
        },5000);
    },1000)
}
async function graceful() {
    console.log('Finished headless browser');
    _browser?.close();
    process.exit(0);
  }
  
  process.on("SIGTERM", graceful);
  process.on("SIGINT", graceful);