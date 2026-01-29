# teambanner-with-teamimage

Sample for defining team images that are displayed in sync with camera switching, shown as a team banner.

定义队伍图像的示例，这些图像随相机切换同步显示，作为队伍横幅显示。

![image](https://github.com/user-attachments/assets/1692d86a-05fc-4cf8-95b1-2b949782ee4d)


## Usage / 使用方法

1. Copy files from `custom-overlays` to `htdocs/custom-overlays` folder. / 将 `custom-overlays` 中的文件复制到 `htdocs/custom-overlays` 文件夹。
2. Copy `team-images` folder to `htdocs` folder. / 将 `team-images` 文件夹复制到 `htdocs` 文件夹。
3. Place team images in `htdocs/team-images` folder. / 在 `htdocs/team-images` 文件夹中放置队伍图像。
4. Configure team name/image mapping in `htdocs/custom-overlays/teambanner-append.css`. (If no image is defined, `team-images/team-default.png` will be displayed) / 在 `htdocs/custom-overlays/teambanner-append.css` 中配置队伍名称/图像映射。（如果未定义图像，将显示 `team-images/team-default.png`）

### Name and Image Definition (teambanner-append.css) / 名称和图像定义

Example of displaying `team-images/team-01.png` for a team named `testteam01`:

为名为 `testteam01` 的队伍显示 `team-images/team-01.png` 图像的示例：

```css
.teamimage[data-camera-team-name="testteam01"] {
    background-image: url('team-images/team-01.png');
}
```
