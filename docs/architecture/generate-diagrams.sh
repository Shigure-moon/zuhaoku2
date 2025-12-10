#!/bin/bash
# PlantUML 图表生成脚本

# 设置脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# PlantUML JAR 文件路径
PLANTUML_JAR="../../plantuml/plantuml.jar"

# 检查 PlantUML JAR 是否存在
if [ ! -f "$PLANTUML_JAR" ]; then
    echo "❌ 错误: 未找到 PlantUML JAR 文件: $PLANTUML_JAR"
    echo "请确保 plantuml.jar 文件存在于 plantuml/ 目录下"
    exit 1
fi

# 检查 Java 是否安装
if ! command -v java &> /dev/null; then
    echo "❌ 错误: 未找到 Java 运行时环境"
    echo "请先安装 Java (JDK 或 JRE)"
    exit 1
fi

echo "✅ 开始生成 PlantUML 图表..."
echo "📁 工作目录: $SCRIPT_DIR"
echo "🔧 PlantUML JAR: $PLANTUML_JAR"
echo ""

# 生成 PNG 格式图表（配置中文字体）
echo "📊 生成 PNG 格式图表（支持中文）..."
# 设置中文字体环境变量
export PLANTUML_LIMIT_SIZE=8192
java -Djava.awt.headless=true -jar "$PLANTUML_JAR" -tpng *.puml 2>&1 | grep -E "(Error|Warning|生成)" || echo "PNG 图表生成完成"

# 生成 SVG 格式图表（矢量图，更适合文档）
echo ""
echo "📊 生成 SVG 格式图表..."
java -Djava.awt.headless=true -jar "$PLANTUML_JAR" -tsvg *.puml 2>&1 | grep -E "(Error|Warning|生成)" || echo "SVG 图表生成完成"

# 统计生成的文件
PNG_COUNT=$(ls -1 *.png 2>/dev/null | wc -l)
SVG_COUNT=$(ls -1 *.svg 2>/dev/null | wc -l)

echo ""
echo "✅ 图表生成完成！"
echo "   PNG 文件: $PNG_COUNT 个"
echo "   SVG 文件: $SVG_COUNT 个"
echo ""
echo "📄 生成的文件列表:"
ls -lh *.png *.svg 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'

