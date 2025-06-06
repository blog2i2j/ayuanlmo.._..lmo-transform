import * as React from "react";
import {useEffect, useState} from "react";
import * as Electron from 'electron';
import * as Components from '../components';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../lib/Store";
import {setConfig, setOutputPath, setParallelTasksLen} from "../lib/Store/AppState";
import {DeleteTmpFile, GetTmpFileInfo} from "../utils/fs";
import Global from "../lib/Global";
import UsrLocalConfig, {DefaultUserConfig, PlayerTypes} from "../lib/UsrLocalConfig";
import {Dispatch} from "@reduxjs/toolkit";

const {ipcRenderer} = Global.requireNodeModule<typeof Electron>('electron');

function Setting(): React.JSX.Element {
    const LocalConfig: DefaultUserConfig = UsrLocalConfig.getLocalUserConf();
    const dispatch: Dispatch = useDispatch();
    const outputPath: string = useSelector((state: RootState) => state.app.outputPath);
    const appConf: DefaultUserConfig = useSelector((state: RootState) => state.app.appConfig);
    const parallelTasksLen: number = useSelector((state: RootState) => state.app.parallelTasksLength);
    const [showDialog, serShowDialogState] = useState<boolean>(false);
    const [selectOutputPath, setSelectOutputPath] = useState<string>(outputPath);
    const [tmpFileSize, setTmpFileSize] = useState<number>(0);
    const [parallelTasksLength, setParallelTasksLength] = useState<number | string>(parallelTasksLen);
    const [pds, setPds] = useState(false);
    const [playerType, setPlayerType] = useState<PlayerTypes>(LocalConfig.player);
    const [windowsMediaPlayerPath, setWindowsMediaPlayerPath] = useState<string>(LocalConfig.windows_media_player_local_path);
    const [vlcMediaPlayerPath, setVlcMediaPlayerPath] = useState<string>(LocalConfig.vlc_media_player_local_path);
    const [codecMethod, setCodecMethod] = useState<string>(LocalConfig.codec_method);
    const [codecType, setCodecType] = useState<string>(LocalConfig.codec_type);

    useEffect((): void => {
        setSelectOutputPath(outputPath);
        dispatch(setOutputPath(selectOutputPath));
        initTmpFileSize();
    }, [showDialog]);

    useEffect((): void => {
        if (parallelTasksLength === '')
            setParallelTasksLength(1);
    }, [parallelTasksLength]);

    const initTmpFileSize = (): void => setTmpFileSize(GetTmpFileInfo().size);

    ipcRenderer.on('SELECTED-DIRECTORY', (event: any, path: string): void => setSelectOutputPath(path));
    const selectPath = (): void => ipcRenderer.send('OPEN-DIRECTORY');

    const saveConfig = async (): Promise<void> => {
        serShowDialogState(!showDialog);
        dispatch(setOutputPath(selectOutputPath));
        dispatch(setParallelTasksLen(parallelTasksLength));
        dispatch(setConfig({
            ...appConf,
            parallel_tasks_length: parallelTasksLength,
            output_path: selectOutputPath
        }));

        ipcRenderer.send('OPEN-PAS', pds);

        await UsrLocalConfig.setConfig(UsrLocalConfig.keyData({
            ...appConf,
            parallel_tasks_length: parallelTasksLength,
            player: playerType,
            windows_media_player_local_path: windowsMediaPlayerPath,
            vlc_media_player_local_path: vlcMediaPlayerPath,
            output_path: selectOutputPath,
            codec_method: codecMethod,
            codec_type: codecType
        } as DefaultUserConfig));
    }

    return (
        <>
            <button onClick={(): void => {
                serShowDialogState(!showDialog);
            }} className={'lmo_cursor_pointer lmo_color_white'}>
                <span>
                    <img src={require('../static/svg/header/setting.svg').default} alt=""/>
                    设置
                </span>
            </button>
            {
                showDialog ? <Components.Dialog height={440} onConfirm={saveConfig} onCancel={(): void => {
                    serShowDialogState(!showDialog);
                }} show={showDialog} title={'设置'}>
                    <div className={'lmo-app-setting'}>
                        <div onClick={selectPath} className={'lmo-app-setting-item'}>
                            <div className={'lmo-app-setting-item-label lmo_color_white'}>输出路径</div>
                            <div className={'lmo-app-setting-item-content'}>
                                <input
                                    value={selectOutputPath}
                                    className={'lmo_color_white lmo_cursor_pointer'}
                                    type="text"
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className={'lmo-app-setting-item'}>
                            <div className={'lmo-app-setting-item-label lmo_color_white'}>并行任务</div>
                            <div className={'lmo-app-setting-item-content'}>
                                <input
                                    value={parallelTasksLength}
                                    className={'lmo_color_white lmo_cursor_pointer'}
                                    min={1}
                                    max={5}
                                    type="number"
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                                        setParallelTasksLength(Number(e.target.value));
                                    }}
                                />
                            </div>
                        </div>
                        <div className={'lmo-app-setting-item'}>
                            <div className={'lmo-app-setting-item-label lmo_color_white'}>默认媒体播放器</div>
                            <div className={'lmo-app-setting-item-content'}>
                                <select
                                    value={playerType}
                                    className={'lmo_cursor_pointer'}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => {
                                        setPlayerType(e.target.value as PlayerTypes);
                                    }}>
                                    <option value="ffplay">ffmpeg player</option>
                                    <option value="wmp">Windows Media Player</option>
                                    <option value="vlc">VLC Media Player</option>
                                </select>
                            </div>
                        </div>
                        <div className={'lmo-app-setting-item'}>
                            <div className={'lmo-app-setting-item-label lmo_color_white'}>编解码方式</div>
                            <div className={'lmo-app-setting-item-content'}>
                                <select
                                    value={codecMethod}
                                    className={'lmo_cursor_pointer'}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => {
                                        setCodecMethod(e.target.value);
                                    }}>
                                    <option value="CPU">CPU (软解)</option>
                                    <option value="GPU">GPU (硬解)</option>
                                </select>
                            </div>
                        </div>
                        <Components.YExtendTemplate show={codecMethod === 'GPU'}>
                            <>
                                <div className={'lmo-app-setting-item'} style={{
                                    paddingBottom: '0'
                                }}>
                                    <div className={'lmo-app-setting-item-label lmo_color_white'}>硬件解码方法</div>
                                    <div className={'lmo-app-setting-item-content'}>
                                        <select
                                            value={codecType}
                                            className={'lmo_cursor_pointer'}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => {
                                                setCodecType(e.target.value);
                                            }}>
                                            <option value="nvenc">NVIDIA (nvenc)</option>
                                            <option value="amf">AMD (amf)</option>
                                            <option value="qsv">Intel (qsv)</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{
                                    width: '100%',
                                    textAlign: 'right',
                                    color: 'red',
                                    fontSize: '12px'
                                }} className={'lmo-app-setting-item-tips'}>请确保您的硬件支持该解码方式且驱动正常，如果遇到错误，请选择CPU作为解码方式。
                                </div>
                            </>
                        </Components.YExtendTemplate>
                        <Components.YExtendTemplate show={playerType !== 'ffplay'}>
                            <div className={'lmo-app-setting-item'}>
                                <div className={'lmo-app-setting-item-label lmo_color_white'}>播放器路径</div>
                                <div className={'lmo-app-setting-item-content'}>
                                    <Components.YExtendTemplate show={playerType === 'vlc'}>
                                        <input
                                            value={vlcMediaPlayerPath}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                                                setVlcMediaPlayerPath(e.target.value);
                                            }}
                                            className={'lmo_color_white lmo_cursor_pointer'}
                                            type="text"
                                        />
                                    </Components.YExtendTemplate>
                                    <Components.YExtendTemplate show={playerType === 'wmp'}>
                                        <input
                                            value={windowsMediaPlayerPath}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                                                setWindowsMediaPlayerPath(e.target.value);
                                            }}
                                            className={'lmo_color_white lmo_cursor_pointer'}
                                            type="text"
                                        />
                                    </Components.YExtendTemplate>
                                </div>
                            </div>
                        </Components.YExtendTemplate>
                        <div className={'lmo-app-setting-item'}>
                            <div className={'lmo-app-setting-item-label lmo_color_white'}>临时文件</div>
                            <div className={'lmo-app-setting-item-content lmo_flex_box'}>
                                <span
                                    className={'lmo_theme_color'}
                                >
                                    {tmpFileSize > 1024 ? (tmpFileSize / 1024).toFixed(2) + 'M' : tmpFileSize + 'KB'}
                                </span>
                                <Components.YExtendTemplate show={tmpFileSize > 0}>
                                    <button onClick={(): void => {
                                        DeleteTmpFile();
                                        initTmpFileSize();
                                    }} className={'lmo_color_white lmo_cursor_pointer'}>删除
                                    </button>
                                </Components.YExtendTemplate>
                            </div>
                        </div>
                        <div className={'lmo-app-setting-item'}>
                            <div style={{width: '158px'}} className={'lmo-app-setting-item-label lmo_color_white'}>
                                阻止低功耗模式
                            </div>
                            <div className={'lmo-app-setting-item-content lmo_flex_box'}>
                                <div>
                                    <Components.YSwitch checked={pds} onChange={(e: boolean): void => {
                                        setPds(e);
                                    }}/>
                                </div>
                                <div className={'lmo-app-setting-item-tips'}>防止Windows进入待机、暂停等状态，仅本次有效
                                </div>
                            </div>
                        </div>
                    </div>
                </Components.Dialog> : <></>
            }
        </>
    );
}

export default Setting;
