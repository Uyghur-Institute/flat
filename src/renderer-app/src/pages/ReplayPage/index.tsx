import React, { useCallback, useEffect, useRef, useState } from "react";
import { RouteComponentProps, useParams } from "react-router";
import PlayerController from "@netless/player-controller";
import LoadingPage from "../../LoadingPage";
import { ipcAsyncByMain } from "../../utils/ipc";
import PageError from "../../PageError";
import { RealtimePanel } from "../../components/RealtimePanel";
import { ChatPanelReplay } from "../../components/ChatPanelReplay";
import ExitButtonPlayer from "../../components/ExitButtonPlayer";
import { OrdinaryRoomInfo } from "../../apiMiddleware/flatServer";
import { RoomType } from "../../apiMiddleware/flatServer/constants";
import { observer } from "mobx-react-lite";
import { useClassRoomReplayStore } from "../../stores/ClassRoomReplayStore";
import { RouteNameType, RouteParams } from "../../utils/routes";

import video_play from "../../assets/image/video-play.svg";
import "video.js/dist/video-js.min.css";
import "./ReplayPage.less";

export type ReplayPageProps = RouteComponentProps<{
    roomUUID: string;
    ownerUUID: string;
}>;

export type ReplayPageState = {
    isReady: boolean;
    isPlaying: boolean;
    isShowController: boolean;
    hasError: boolean;

    isVisible: boolean;
    replayFail: boolean;
    replayState: boolean;
    withVideo: boolean;
    roomInfo: OrdinaryRoomInfo | null;
};

export const ReplayPage = observer<ReplayPageProps>(function ReplayPage() {
    const whiteboardElRef = useRef<HTMLDivElement>(null);
    const videoElRef = useRef<HTMLVideoElement>(null);

    const params = useParams<RouteParams<RouteNameType.ReplayPage>>();
    const classRoomReplayStore = useClassRoomReplayStore(
        params.roomUUID,
        params.ownerUUID,
        params.roomType as RoomType,
    );

    const [isShowController, setShowController] = useState(false);
    const hideControllerTimeoutRef = useRef<number>();
    const lastMouseRef = useRef({ lastMouseX: -100, lastMouseY: -100 });

    useEffect(() => {
        ipcAsyncByMain("set-win-size", {
            width: 1200,
            height: 700,
        });

        return () => {
            window.clearTimeout(hideControllerTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        classRoomReplayStore.init(whiteboardElRef.current!, videoElRef.current!);

        const handleSpaceKey = (evt: KeyboardEvent): void => {
            if (evt.key === "Space") {
                classRoomReplayStore.togglePlayPause();
            }
        };

        window.addEventListener("keydown", handleSpaceKey);

        return () => {
            classRoomReplayStore.destroy();
            window.removeEventListener("keydown", handleSpaceKey);
        };
    }, [classRoomReplayStore]);

    return (
        <div className="replay-container">
            {classRoomReplayStore.roomType === RoomType.SmallClass && renderSmallClassAvatars()}
            <div className="replay-content">
                {renderWhiteboard()}
                {renderRealtimePanel()}
            </div>
            {renderOverlay()}
            {classRoomReplayStore.roomInfo && (
                <div className="replay-exit">
                    <ExitButtonPlayer
                        roomType={classRoomReplayStore.roomType ?? RoomType.BigClass}
                        roomUUID={classRoomReplayStore.roomUUID}
                        ownerUUID={classRoomReplayStore.ownerUUID}
                    />
                </div>
            )}
        </div>
    );

    function renderSmallClassAvatars(): React.ReactElement {
        return (
            <div className="replay-small-class-avatars">
                <video className="replay-small-class-avatars-video" ref={videoElRef} />
            </div>
        );
    }

    function renderWhiteboard(): React.ReactElement {
        return (
            <div className="replay-whiteboard-wrap">
                <div
                    className="replay-whiteboard"
                    ref={whiteboardElRef}
                    onMouseMove={handleMouseMove}
                ></div>
                {!classRoomReplayStore.isPlaying && (
                    <div
                        className="replay-play-overlay"
                        onClick={classRoomReplayStore.togglePlayPause}
                    >
                        <button className="replay-play-icon">
                            <img src={video_play} alt="play" />
                        </button>
                    </div>
                )}
                {isShowController &&
                    classRoomReplayStore.isReady &&
                    classRoomReplayStore.smartPlayer.whiteboardPlayer && (
                        <PlayerController
                            player={classRoomReplayStore.smartPlayer.whiteboardPlayer}
                            combinePlayer={classRoomReplayStore.smartPlayer.combinePlayer}
                        />
                    )}
            </div>
        );
    }

    function renderRealtimePanel(): React.ReactElement {
        return (
            <RealtimePanel
                isVideoOn={
                    classRoomReplayStore.roomType === RoomType.BigClass &&
                    classRoomReplayStore.withRTCVideo
                }
                isShow={true}
                videoSlot={
                    classRoomReplayStore.roomType === RoomType.BigClass && (
                        <video className="replay-big-class-video" ref={videoElRef} />
                    )
                }
                chatSlot={
                    classRoomReplayStore.smartPlayer.whiteboardPlayer && (
                        <ChatPanelReplay
                            userUUID={classRoomReplayStore.userUUID}
                            messages={classRoomReplayStore.messages}
                        />
                    )
                }
            />
        );
    }

    function renderOverlay(): React.ReactElement | null {
        return classRoomReplayStore.error ? (
            <div className="replay-overlay">
                <PageError />
            </div>
        ) : classRoomReplayStore.isReady ? null : (
            <div className="replay-overlay">
                <LoadingPage text={"正在生成回放请耐心等待"} />
            </div>
        );
    }

    function handleMouseMove(evt: React.MouseEvent<HTMLDivElement>): void {
        const { lastMouseX, lastMouseY } = lastMouseRef.current;
        lastMouseRef.current = { lastMouseX: evt.clientX, lastMouseY: evt.clientY };
        // ignore movement within a few pixels
        if (Math.abs(evt.clientX - lastMouseX) < 2 || Math.abs(evt.clientY - lastMouseY) < 2) {
            return;
        }
        setShowController(true);
        window.clearTimeout(hideControllerTimeoutRef.current);
        hideControllerTimeoutRef.current = window.setTimeout(() => {
            setShowController(false);
        }, 2000);
    }
});

export default ReplayPage;
