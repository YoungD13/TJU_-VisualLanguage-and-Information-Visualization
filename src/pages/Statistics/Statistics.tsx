// Statistics.tsx
import React, {
    useEffect,
    useRef,
    useMemo,
    useState,
    useCallback,
} from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { Radio, Divider } from 'antd';

interface StatisticsProps {
    allPapers: any[]; // 传入当前优先级筛选后的列表 (用于计算图表)
    onLiteratureFilter: (selectedPapers: any[]) => void; // 输出统计筛选结果 (中优先级)
    highlightedPapers: any[]; // 传入高亮论文列表
    onLiteratureClick: (papers: any[], selectedItem: any | null) => void; // 输出点击的论文详情和高亮
}

// 图表配置
const PIE_VIEWBOX_SIZE = 400;
const BAR_VIEWBOX_WIDTH = 400;
const BAR_VIEWBOX_HEIGHT = 400;
const MARGIN = { top: 20, right: 20, bottom: 60, left: 60 };

// 辅助函数：获取论文的唯一标识符
const getPaperId = (paper: any): string => {
    return paper.PaperId || paper.DOI || paper.Title || '';
};

// 辅助函数：判断两个论文是否相同
const isSamePaper = (p1: any, p2: any): boolean => {
    const id1 = getPaperId(p1);
    const id2 = getPaperId(p2);
    if (!id1 || !id2) return false;
    return id1 === id2;
};

const Statistics: React.FC<StatisticsProps> = ({
    allPapers,
    onLiteratureFilter,
    highlightedPapers,
    onLiteratureClick,
}) => {
    const svgRef = useRef(null);
    const [chartType, setChartType] = useState<
        'conference' | 'award' | 'resources'
    >('conference');

    // Tooltip
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    // 1. 数据聚合 (根据当前 allPapers 动态计算)
    const aggregatedData = useMemo(() => {
        const calculateData = (key: 'Conference' | 'Award' | 'Resources') => {
            const papersByKey = d3.group(
                allPapers.filter(
                    (d) =>
                        d[key] &&
                        d[key] !== null &&
                        (Array.isArray(d[key]) ? d[key].length > 0 : true),
                ),
                (d: any) =>
                    Array.isArray(d[key]) ? d[key].join(', ') : d[key],
            );

            return Array.from(papersByKey, ([category, papers]) => ({
                category,
                count: papers.length,
                papers: papers,
            })).sort((a, b) => b.count - a.count);
        };

        return {
            conference: calculateData('Conference').slice(0, 10),
            award: calculateData('Award').slice(0, 10),
            resources: calculateData('Resources').slice(0, 10),
        };
    }, [allPapers]);

    // 2. D3 绘图核心逻辑
    const drawChart = useCallback(() => {
        if (!svgRef.current || allPapers.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        if (!tooltipRef.current) {
            tooltipRef.current = d3
                .select('body')
                .append('div')
                .attr('class', 'stats-tooltip')
                .style('position', 'absolute')
                .style('visibility', 'hidden')
                .style('background', 'rgba(0,0,0,0.7)')
                .style('color', 'white')
                .style('padding', '5px')
                .style('border-radius', '3px')
                .style('pointer-events', 'none')
                .node();
        }
        const tooltip = d3.select(tooltipRef.current);

        const currentData = aggregatedData[chartType];
        // 使用更美观的渐变色方案
        const colorScale = d3
            .scaleSequential(d3.interpolateViridis)
            .domain([0, currentData.length - 1]);

        // --- 绘制饼图 ---
        if (chartType === 'conference') {
            const radius = PIE_VIEWBOX_SIZE / 2 - 20;
            const innerRadius = radius / 3;

            const pieSvg = svg
                .append('svg')
                .attr('viewBox', `0 0 ${PIE_VIEWBOX_SIZE} ${PIE_VIEWBOX_SIZE}`)
                .style('width', '100%')
                .style('height', '100%');

            const g = pieSvg
                .append('g')
                .attr(
                    'transform',
                    `translate(${PIE_VIEWBOX_SIZE / 2}, ${
                        PIE_VIEWBOX_SIZE / 2
                    })`,
                );

            const pie = d3
                .pie<{ category: string; count: number }>()
                .value((d) => d.count)
                .sort(null);

            const arc = d3
                .arc<d3.PieArcDatum<{ category: string; count: number }>>()
                .innerRadius(innerRadius)
                .outerRadius(radius);

            const total = d3.sum(currentData, (d) => d.count);

            const arcElements = g
                .selectAll('.arc')
                .data(pie(currentData))
                .enter()
                .append('g')
                .attr('class', 'arc');

            arcElements
                .append('path')
                .attr('d', arc)
                .attr('fill', (d, i) => colorScale(i))
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('click', (event: any, d: any) => {
                    // 筛选：只显示点击类别的论文
                    onLiteratureFilter(d.data.papers);
                })
                // 悬停交互
                .on('mouseover', function (event: any, d: any) {
                    d3.select(this).style('opacity', 0.8);
                    tooltip
                        .html(
                            `
                        ${d.data.category}: ${d.data.count} 篇<br/>
                        占比: ${((d.data.count / total) * 100).toFixed(1)}%
                    `,
                        )
                        .style('visibility', 'visible')
                        .style('left', `${event.pageX + 10}px`)
                        .style('top', `${event.pageY + 10}px`);
                })
                .on('mouseout', function (event: any, d: any) {
                    // 恢复默认，但如果高亮，保持高亮
                    const isHighlighted = highlightedPapers.some((p: any) =>
                        d.data.papers.some((pp: any) => isSamePaper(pp, p)),
                    );
                    d3.select(this).style('opacity', isHighlighted ? 0.6 : 1.0);
                    tooltip.style('visibility', 'hidden');
                });

            // 实时更新高亮
            arcElements.select('path').style('opacity', (d: any) => {
                const isHighlighted = highlightedPapers.some((p: any) =>
                    d.data.papers.some((pp: any) => isSamePaper(pp, p)),
                );
                return isHighlighted ? 0.6 : 1.0;
            });
        }
        // --- 绘制直方图 (Award / Resources) ---
        else if (chartType === 'award' || chartType === 'resources') {
            const width = BAR_VIEWBOX_WIDTH - MARGIN.left - MARGIN.right;
            const height = BAR_VIEWBOX_HEIGHT - MARGIN.top - MARGIN.bottom;

            const barSvg = svg
                .append('svg')
                .attr(
                    'viewBox',
                    `0 0 ${BAR_VIEWBOX_WIDTH} ${BAR_VIEWBOX_HEIGHT}`,
                )
                .style('width', '100%')
                .style('height', '100%');

            // 创建渐变定义
            const defs = barSvg.append('defs');

            // 为每个条形创建渐变
            currentData.forEach((d, i) => {
                const gradient = defs
                    .append('linearGradient')
                    .attr('id', `barGradient${i}`)
                    .attr('x1', '0%')
                    .attr('y1', '0%')
                    .attr('x2', '0%')
                    .attr('y2', '100%');
                const baseColor = d3.color(colorScale(i))!;
                gradient
                    .append('stop')
                    .attr('offset', '0%')
                    .attr('stop-color', baseColor.brighter(0.5).toString())
                    .attr('stop-opacity', 1);
                gradient
                    .append('stop')
                    .attr('offset', '100%')
                    .attr('stop-color', baseColor.darker(0.3).toString())
                    .attr('stop-opacity', 1);
            });

            // 添加阴影滤镜
            const filter = defs
                .append('filter')
                .attr('id', 'barShadow')
                .attr('x', '-50%')
                .attr('y', '-50%')
                .attr('width', '200%')
                .attr('height', '200%');
            filter
                .append('feGaussianBlur')
                .attr('in', 'SourceAlpha')
                .attr('stdDeviation', 2);
            filter
                .append('feOffset')
                .attr('dx', 2)
                .attr('dy', 2)
                .attr('result', 'offsetblur');
            const feComponentTransfer = filter
                .append('feComponentTransfer')
                .attr('in', 'offsetblur');
            feComponentTransfer
                .append('feFuncA')
                .attr('type', 'linear')
                .attr('slope', 0.3);
            const feMerge = filter.append('feMerge');
            feMerge.append('feMergeNode');
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

            const g = barSvg
                .append('g')
                .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

            const x = d3
                .scaleBand()
                .domain(currentData.map((d) => d.category))
                .range([0, width])
                .padding(0.15);

            const y = d3
                .scaleLinear()
                .domain([0, d3.max(currentData, (d) => d.count)!])
                .nice()
                .range([height, 0]);

            // 绘制 X 轴（美化样式）
            g.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll('text')
                .style('text-anchor', 'end')
                .style('font-size', '11px')
                .style('fill', '#666')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .attr('transform', 'rotate(-45)');

            g.selectAll('.domain, .tick line')
                .style('stroke', '#ddd')
                .style('stroke-width', 1);

            // 绘制 Y 轴（美化样式）
            g.append('g')
                .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')))
                .selectAll('text')
                .style('font-size', '11px')
                .style('fill', '#666');

            g.selectAll('.domain, .tick line')
                .style('stroke', '#ddd')
                .style('stroke-width', 1);

            // 绘制条形图（使用渐变和阴影）
            const barElements = g
                .selectAll('.bar')
                .data(currentData)
                .join(
                    (enter) => {
                        const bars = enter
                            .append('rect')
                            .attr('class', 'bar')
                            .attr('x', (d: any) => x(d.category)!)
                            .attr('y', height) // 从底部开始
                            .attr('width', x.bandwidth())
                            .attr('height', 0) // 初始高度为0
                            .attr(
                                'fill',
                                (d: any, i: number) => `url(#barGradient${i})`,
                            )
                            .attr('filter', 'url(#barShadow)')
                            .attr('rx', 4) // 圆角
                            .attr('ry', 4)
                            .style('cursor', 'pointer')
                            .on('click', (event: any, d: any) => {
                                // 筛选：只显示点击类别的论文
                                onLiteratureFilter(d.papers);
                            })
                            // 悬停交互
                            .on('mouseover', function (event: any, d: any) {
                                d3.select(this)
                                    .style('opacity', 0.9)
                                    .attr('y', y(d.count) - 3)
                                    .attr('height', height - y(d.count) + 3)
                                    .attr(
                                        'filter',
                                        'url(#barShadow) brightness(1.1)',
                                    );
                                tooltip
                                    .html(
                                        `
                                    <div style="font-weight: bold; margin-bottom: 4px; color: #fff;">${d.category}</div>
                                    <div style="color: #fff;">数量: ${d.count} 篇</div>
                                `,
                                    )
                                    .style('visibility', 'visible')
                                    .style('left', `${event.pageX + 10}px`)
                                    .style('top', `${event.pageY + 10}px`);
                            })
                            .on('mouseout', function (event: any, d: any) {
                                // 恢复默认，但如果高亮，保持高亮
                                const isHighlighted = highlightedPapers.some(
                                    (p: any) =>
                                        d.papers.some((pp: any) =>
                                            isSamePaper(pp, p),
                                        ),
                                );
                                d3.select(this)
                                    .style('opacity', isHighlighted ? 0.7 : 1.0)
                                    .attr('y', y(d.count))
                                    .attr('height', height - y(d.count))
                                    .attr(
                                        'filter',
                                        isHighlighted
                                            ? 'url(#barShadow) brightness(1.05)'
                                            : 'url(#barShadow)',
                                    );
                                tooltip.style('visibility', 'hidden');
                            });
                        // 动画效果
                        bars.transition()
                            .duration(800)
                            .ease(d3.easeElasticOut)
                            .attr('y', (d: any) => y(d.count))
                            .attr('height', (d: any) => height - y(d.count));
                        return bars;
                    },
                    (update) => {
                        update
                            .transition()
                            .duration(400)
                            .attr('x', (d: any) => x(d.category)!)
                            .attr('width', x.bandwidth())
                            .attr('y', (d: any) => y(d.count))
                            .attr('height', (d: any) => height - y(d.count))
                            .attr(
                                'fill',
                                (d: any, i: number) => `url(#barGradient${i})`,
                            );
                        return update;
                    },
                    (exit) => exit.remove(),
                );

            // 实时更新高亮
            barElements
                .style('opacity', (d: any) => {
                    const isHighlighted = highlightedPapers.some((p: any) =>
                        d.papers.some((pp: any) => isSamePaper(pp, p)),
                    );
                    return isHighlighted ? 0.7 : 1.0;
                })
                .attr('stroke', (d: any) => {
                    const isHighlighted = highlightedPapers.some((p: any) =>
                        d.papers.some((pp: any) => isSamePaper(pp, p)),
                    );
                    return isHighlighted ? '#FFD700' : 'none';
                })
                .attr('stroke-width', (d: any) => {
                    const isHighlighted = highlightedPapers.some((p: any) =>
                        d.papers.some((pp: any) => isSamePaper(pp, p)),
                    );
                    return isHighlighted ? 3 : 0;
                })
                .attr('filter', (d: any) => {
                    const isHighlighted = highlightedPapers.some((p: any) =>
                        d.papers.some((pp: any) => isSamePaper(pp, p)),
                    );
                    return isHighlighted
                        ? 'url(#barShadow) brightness(1.1)'
                        : 'url(#barShadow)';
                });
        }
    }, [
        chartType,
        aggregatedData,
        allPapers,
        onLiteratureFilter,
        highlightedPapers,
    ]);

    useEffect(() => {
        drawChart();
    }, [drawChart]);

    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            <Radio.Group
                onChange={(e) => setChartType(e.target.value)}
                value={chartType}
                size="small"
                style={{ marginBottom: '10px' }}
            >
                <Radio.Button value="conference">会议 (饼图)</Radio.Button>
                <Radio.Button value="award">奖项 (直方图)</Radio.Button>
                <Radio.Button value="resources">资源类别 (直方图)</Radio.Button>
            </Radio.Group>
            <div
                style={{ flex: 1, minHeight: 0, padding: '10px 0' }}
                ref={svgRef}
            >
                {allPapers.length === 0 && (
                    <p
                        style={{
                            textAlign: 'center',
                            color: '#888',
                            marginTop: '50px',
                        }}
                    >
                        当前筛选条件下无数据。
                    </p>
                )}
            </div>
        </div>
    );
};

export default Statistics;
