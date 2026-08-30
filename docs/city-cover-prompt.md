# NTO 城市封面母版

用于 Toni 与 Rosalie 的城市主页封面。每次新增城市，只替换“城市变量”；标题、版式、纸张质感和双色路线保持一致。

## 固定不变量

- 画幅：`1734:907` 横向网页 Hero，主体避开页面叠加的计数标签。
- 风格：暖米纸、旧印刷颗粒、墨线版画、朱红与墨绿、真实纸张拼贴；亲密而克制，不做旅游广告。
- 左侧标题逐字写为四行：

  ```text
  TONI
  ROSALIE
  NTO
  NEXT TRAVEL OUTLINE
  ```

- `TONI`、`ROSALIE`、`NTO` 必须完整大写、三行纵向排列，左边缘严格对齐；不得缩写成 `TO` 或 `RO`。
- `NEXT TRAVEL OUTLINE` 是 `NTO` 下方的小号释义，同样左对齐。
- 右侧保留双色旅行路线、地图纹理、手账和指南针；右下角是本城市的主要视觉拼贴。
- 图中不写城市名，不出现其他文字、Logo、水印、人物或 `EXPERIENCE`。

## 可替换城市变量

```text
{{CITY_ID}}                 稳定英文 ID，例如 guangzhou
{{CITY_NAME}}               城市名，仅用于理解，不写进图片
{{CITY_ELEMENT}}            本城市最具辨识度的主视觉元素，固定放在右下角
{{MAP_CHARACTER}}           城市地理或水系纹理
{{LANDMARKS}}               2–3 个真正属于本地的建筑/天际线
{{LANDSCAPE}}               海岸、江河、山体、湿地或街巷
{{BOTANICAL_MOTIF}}         一种本地植物
{{LOCAL_FOOD}}              一种适合右下角近景的本地食物
{{SMALL_EPHEMERA}}          可选的一件本地小物；没有合适内容就留空
{{FORBIDDEN_CITY_MOTIFS}}   容易和邻近城市混淆、必须排除的元素
```

## GPT Image 2 Prompt

```text
Use case: style-transfer
Asset type: wide website hero illustration for a private couple's travel archive
Input image: the latest approved NTO city cover is the layout and style reference.

Primary request: Create the {{CITY_NAME}} edition. Preserve the reference image's exact wide composition, title hierarchy, line spacing, rice-paper texture, two-color route, map layer, notebook and compass. Replace every previous-city motif with a coherent {{CITY_NAME}} story.

Title system on the left, verbatim:
TONI
ROSALIE
NTO
NEXT TRAVEL OUTLINE

TONI, ROSALIE and NTO are three large uppercase lines with perfectly aligned left edges, one below another. NEXT TRAVEL OUTLINE is much smaller directly beneath NTO and shares the same left edge. Never abbreviate TONI to TO or ROSALIE to RO.

City localization: concentrate the recognizable city collage on the right and lower-right. Place {{CITY_ELEMENT}} as the dominant city-specific element at the bottom-right. Use {{MAP_CHARACTER}} as the faint map texture; {{LANDMARKS}} as restrained ink landmarks; {{LANDSCAPE}} as the grounding scene; {{BOTANICAL_MOTIF}} as the botanical accent; and {{LOCAL_FOOD}} as the close foreground object. {{SMALL_EPHEMERA}}. The result must unmistakably belong to {{CITY_NAME}} even though the city name itself is not printed. Exclude {{FORBIDDEN_CITY_MOTIFS}}.

Style/medium: warm rice-paper texture, distressed editorial serif typography, fine ink engraving, muted cinnabar and deep moss green, tactile vintage travel-journal collage, intimate rather than promotional.

Text (verbatim, exact): "TONI", "ROSALIE", "NTO", "NEXT TRAVEL OUTLINE"

Constraints: preserve a clean readable title area; keep localized imagery on the right/lower-right; no visible city name; no other words; no malformed letters; no TO or RO abbreviations; no ampersand; no EXPERIENCE; no logos; no watermark; no photorealistic people.
```

## 当前三城变量

| 城市 | MAP / LANDMARKS / LANDSCAPE | 植物 | 右下角食物 | 排除 |
|---|---|---|---|---|
| 汕頭 | 海港与老城街图、骑楼、渡船或灯塔、礐石海岸 | 榕树 | 潮汕白粥 | 广州塔、深圳天际线 |
| 廣州 | 珠江水系、岭南骑楼、广州塔、珠江沿岸 | 木棉 | 广式早茶点心与茶 | 深圳湾、汕头灯塔 |
| 深圳 | 深圳湾海岸、现代天际线、红树林木栈道 | 簕杜鹃 | 椰子鸡 | 广州骑楼、汕头老港 |

## 出图检查

1. 放大检查四段英文是否逐字正确，尤其是 `ROSALIE` 和 `OUTLINE`。
2. 检查三行大标题是否同一左边缘、没有 `&`、没有 `EXPERIENCE`。
3. 遮住左侧标题后，仍能从右下角判断是哪座城市。
4. 检查上一座城市的地标、食物和植物是否全部被替换。
5. 在桌面与手机裁切下检查标题、路线和右下角主体都没有被截断。

