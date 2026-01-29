# teambanner-with-players-image

Sample for defining player images that are displayed in sync with camera switching, shown as a team banner.

定义玩家图像的示例，这些图像随相机切换同步显示，作为队伍横幅显示。

![image](https://github.com/user-attachments/assets/00000000-0000-0000-0000-000000000000)

## Usage / 使用方法

1. Copy files from `custom-overlays` to `htdocs/custom-overlays` folder. / 将 `custom-overlays` 中的文件复制到 `htdocs/custom-overlays` 文件夹。
2. Copy `player-images` folder to `htdocs` folder. / 将 `player-images` 文件夹复制到 `htdocs` 文件夹。
3. Place player images in `htdocs/player-images` folder. / 在 `htdocs/player-images` 文件夹中放置玩家图像。
4. Configure player name/image mapping in `htdocs/custom-overlays/teambanner-append.css`. (If no image is defined, `player-images/player-default.png` will be displayed) / 在 `htdocs/custom-overlays/teambanner-append.css` 中配置玩家名称/图像映射。（如果未定义图像，将显示 `player-images/player-default.png`）

### Name and Image Definition (teambanner-append.css) / 名称和图像定义

Example of displaying `player-images/player-01.png` for a player named `testplayer01`:

为名为 `testplayer01` 的玩家显示 `player-images/player-01.png` 图像的示例：

```css
.playerimage[data-camera-player-name="testplayer01"] {
    background-image: url('player-images/player-01.png');
}
```
