import {FfmpegStreamsTypes, getFileInfo, GetFileInfoTypes, getMediaFirstFrame} from "../bin/ff";
import {ResolvePath} from "./index";
import AppConfig from "../conf/AppConfig";
import store from '../lib/Store/index'
import {setGlobalLoading} from "../lib/Store/AppState";
import {FILE_ERROR_MESSAGE} from "../const/Message";
import {File} from "../bin/file";
import * as Root from "../Root";
import * as Electron from 'electron';
import * as FS from 'fs';
import Global from "../lib/Global";
import {ResourceInfoTypes} from "../template/ResourceItem";

const {ipcRenderer} = Global.requireNodeModule<typeof Electron>('electron');
const fs = Global.requireNodeModule<typeof FS>('fs');

interface ResolveFileTypes extends GetFileInfoTypes {
    name: string;
    path: string;
    type: string;
    cover: string;
    lastModified: number;
    output: {
        type: string;
    }
}

/**
 * @method SelectFile
 * @returns {Promise<[{
 *     ResolveFileTypes
 * }]>}
 * **/
const SelectFile = (): Promise<Array<ResolveFileTypes>> => {
    return new Promise((resolve, reject): void => {
        const i: any = document.createElement('input');
        i.type = 'file';
        i.multiple = true;
        i.accept = 'video/*';
        i.onchange = async () => {
            resolve(resolveFile(i.files));
        }
        i.click();
    });
}

export function targetIs(info: GetFileInfoTypes | ResourceInfoTypes, type: "video" | "audio" | string): boolean {
    const {streams} = info;
    if (streams.length === 0) return false;

    // 如果只有一条轨道，判断其编解码类型是否与目标类型相符
    if (streams.length === 1)
        return streams[0].codec_type === type;

    if (type === 'video') {
        // 存在宽度和高度信息，或者媒体类型中包含 video
        return !!(info.width && info.height) || ("type" in info && info.type.includes('video'));
    } else if (type === 'audio') {
        const audioTrackVideoTypes = ['mjpeg', 'png'];
        // 是否存在非mjpeg的视频轨道（带有封面图的音频文件存在一个或多个mjpeg的轨道，但是他的轨道类型为video，需要排除掉）
        const hasMjpegVideoTrack: boolean = streams.some((i: FfmpegStreamsTypes): boolean => i.codec_type === 'video' && !audioTrackVideoTypes.includes(i.codec_name));
        // 检查是否存在音频轨道
        const hasAudioTrack: boolean = streams.some((i: FfmpegStreamsTypes): boolean => i.codec_type === 'audio');

        return !hasMjpegVideoTrack && hasAudioTrack;
    }

    return false;
}

const resolveFile = async (files: Array<Root.File>): Promise<any[]> => {
    store.dispatch(setGlobalLoading(true));
    const _: any[] | PromiseLike<any[]> = [];

    for (let j = 0; j < files.length; j++) {
        const filePath: string = files[j].path.split('\\').join('/');

        await getFileInfo(filePath).then(async (fileInfo: GetFileInfoTypes) => {
            const isVideo: boolean = targetIs(fileInfo, 'video');
            const isAudio: boolean = targetIs(fileInfo, 'audio');

            try {
                if (files[j].type !== '')
                    _.push({
                        name: files[j].name,
                        path: ResolvePath(files[j].path),
                        type: files[j].type,
                        cover: File.isImageFile(filePath) ? filePath : isVideo ? await getMediaFirstFrame(filePath) : isAudio ? await getMediaFirstFrame(filePath, 'audio') : '',
                        lastModified: files[j].lastModified,
                        ...fileInfo,
                        output: {
                            type: '',
                            libs: ''
                        },
                        status: 'pending',
                        currentSchedule: 0,
                        optPath: ''
                    });
            } catch (e: any) {
                store.dispatch(setGlobalLoading(false));
            }
        }).catch((e: any): void => {
            ipcRenderer.send('SHOW-ERROR-MESSAGE-BOX', {
                msg: FILE_ERROR_MESSAGE(filePath, e.toString())
            });
        })
    }
    store.dispatch(setGlobalLoading(false));

    return _;
}

const resolveUrlFile = async (urls: Array<string>): Promise<any> => {
    store.dispatch(setGlobalLoading(true));
    const _: any[] | PromiseLike<any[]> = [];

    for (let i: number = 0; i < urls.length; i++) {
        const file: string = urls[i];

        try {
            await getFileInfo(urls[i]).then(async (fileInfo: GetFileInfoTypes) => {
                const isVideo: boolean = targetIs(fileInfo, 'video');

                _.push({
                    name: file,
                    path: file,
                    type: '',
                    cover: File.isImageFile(file) ? file : isVideo ? await getMediaFirstFrame(file) : await getMediaFirstFrame(file, 'audio'),
                    lastModified: '',
                    ...fileInfo,
                    output: {
                        type: '',
                        libs: ''
                    },
                    status: 'pending',
                    currentSchedule: 0,
                    optPath: ''
                });
            });
        } catch (e: any) {
            e = e.toString();

            ipcRenderer.send('SHOW-ERROR-MESSAGE-BOX', {
                msg: e.includes('I/O error') ? `请检查${[file]}串流地址是否正确` : FILE_ERROR_MESSAGE(file, e.toString())
            });
        }

    }
    store.dispatch(setGlobalLoading(false));

    return _;
}

const GetTmpFileInfo = (): { total: number; size: number; } => {
    const path: string = AppConfig.system.tempPath + AppConfig.appName + '/tmp';
    const files: Array<string> = fs.readdirSync(path);
    let size: number = 0;

    files.forEach((i: string): void => {
        const file: { size: number } = fs.statSync(path + '/' + i);
        size += file.size;
    });

    return {
        total: files.length,
        size: Math.ceil(size / 1024)
    }
}

const DeleteTmpFile = (file: string = '') => {
    const path: string = file === '' ? AppConfig.system.tempPath + AppConfig.appName + '/tmp' : file;
    const files: Array<string> = fs.readdirSync(path);

    if (fs.existsSync(path)) {
        files.forEach((i: string): void => {
            const _tmp: string = `${path}/${i}`;

            if (fs.statSync(_tmp).isDirectory())
                DeleteTmpFile(_tmp);
            else
                fs.unlinkSync(_tmp);
        });
    }
}

export {ResolveFileTypes}
export {SelectFile}
export {resolveFile}
export {resolveUrlFile}
export {GetTmpFileInfo}
export {DeleteTmpFile}
