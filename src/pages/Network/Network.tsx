// Network.tsx
import React, {
    useEffect,
    useRef,
    useState,
    useCallback,
    useMemo,
} from 'react';
import * as d3 from 'd3';
import { Button } from 'antd';
// 假设 author_network.json 包含 nodes: {id, paper: [paper_ids...]}, links: {source, target, value}
import networkData from '../../../public/data/author_network.json';

interface NetworkProps {
    allPapers: any[]; // 来自 Timeline 的基础筛选列表
    onLiteratureFilter: (selectedPapers: any[]) => void; // 框选/点击作者输出，用于设置高优先级筛选
    highlightedPapers: any[]; // 传入高亮论文列表
    onLiteratureClick: (papers: any[], selectedItem: any | null) => void; // 点击边/节点输出，用于设置高亮和详情
}

// 定义数据类型 (必须包含 x, y 用于静态布局)
type NodeDatum = {
    id: number | string; // 节点ID（可能是数字或字符串）
    name?: string; // 作者名称（如果存在）
    paper: any[]; // 该作者的所有论文列表（DOI数组）
    x: number;
    y: number;
    // ... 其他属性
};

type LinkDatum = {
    source: NodeDatum;
    target: NodeDatum;
    value: number; // 合作文章数量
    papers: any[]; // 合作文章列表
};

// 预处理原始网络数据
const preProcessedNetworkData = (AU_SIZE: number) => {
    const networkDataTyped = networkData as { nodes: any[]; links: any[] };
    // 1. 节点数据初始化：随机生成 x/y 坐标
    const nodes: NodeDatum[] = networkDataTyped.nodes.map((d: any) => ({
        ...d,
        paper: d.paper || [],
        x: Math.random() * (AU_SIZE - 200) + 100, // 确保在边界内
        y: Math.random() * (AU_SIZE - 200) + 100,
    }));

    // 2. 创建 ID 到节点的映射
    const nodeMap = new Map(nodes.map((d) => [d.id, d]));

    // 3. 链接数据处理：将 source/target ID 替换为实际的 NodeDatum 对象，并添加 papers 列表
    const links: LinkDatum[] = networkDataTyped.links
        .map((d: any) => ({
            ...d,
            source: nodeMap.get(d.source),
            target: nodeMap.get(d.target),
            papers: d.papers || [], // 假设原始数据中包含合作论文的列表
        }))
        .filter((d: any) => d.source && d.target) as LinkDatum[];

    return { nodes, links };
};

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

const Network: React.FC<NetworkProps> = ({
    allPapers,
    onLiteratureFilter,
    highlightedPapers,
    onLiteratureClick,
}) => {
    const AU_SIZE = 1600;
    const containerRef = useRef<HTMLDivElement>(null);
    const [enableSelection, setEnableSelection] = useState(false);

    // 预加载并固定布局
    const { nodes: allNodes, links: allLinks } = useMemo(
        () => preProcessedNetworkData(AU_SIZE),
        [],
    );

    // Tooltip
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    // 根据 allPapers (来自 Timeline) 筛选出可见的节点和边
    const currentNetworkData = useMemo(() => {
        // 如果 allPapers 为空，显示所有网络（不应该发生，但作为保护）
        if (!allPapers || allPapers.length === 0) {
            return { nodes: allNodes, links: allLinks };
        }

        // 获取当前筛选列表中的所有作者ID（规范化处理）
        const currentAuthors = new Set(
            allPapers.flatMap((p) => {
                const authors =
                    p.AuthorNames || p['AuthorNames-Dedpuped'] || [];
                const authorList = Array.isArray(authors)
                    ? authors
                    : authors
                    ? [authors]
                    : [];
                // 规范化：去除空格，统一大小写（用于更宽松的匹配）
                return authorList.map((a: string) => a?.trim()).filter(Boolean);
            }),
        );

        const currentPaperIds = new Set(allPapers.map((p) => getPaperId(p))); // 用于精确筛选边

        // 筛选节点：使用更宽松的匹配策略
        const filteredNodes = allNodes.filter((n) => {
            // 获取作者名称：优先使用 name 字段，如果没有则使用 id（转换为字符串）
            const authorName = n.name || String(n.id || '');
            if (!authorName) return false;

            // 策略1: 直接匹配作者名（精确匹配）
            if (currentAuthors.has(authorName)) return true;

            // 策略2: 规范化匹配（去除空格）
            const normalizedAuthorName =
                typeof authorName === 'string'
                    ? authorName.trim()
                    : String(authorName).trim();
            if (
                Array.from(currentAuthors).some((a) => {
                    const authorStr =
                        typeof a === 'string' ? a : String(a || '');
                    return authorStr.trim() === normalizedAuthorName;
                })
            )
                return true;

            // 策略3: 该节点的论文中有任何一篇在当前筛选列表中
            // paper 数组包含的是 DOI 字符串，需要与 allPapers 中的论文匹配
            if (n.paper && n.paper.length > 0) {
                return n.paper.some((paperDoi: string) => {
                    // 检查是否有论文的 DOI 匹配
                    return allPapers.some((p) => {
                        const paperId = getPaperId(p);
                        return paperId === paperDoi || p.DOI === paperDoi;
                    });
                });
            }

            return false;
        });

        // 如果筛选后没有节点，可能是作者名称不匹配，显示所有网络（避免空白）
        if (filteredNodes.length === 0 && allPapers.length > 100) {
            // 如果论文数量很多（说明筛选不严格），显示所有网络
            return { nodes: allNodes, links: allLinks };
        }

        // 筛选边：只有当边的两端节点都在 filteredNodes 中
        const filteredLinks = allLinks.filter((l) => {
            // 使用 id 匹配节点（id 可能是数字或字符串）
            const sourceVisible = filteredNodes.some((n) => {
                return (
                    String(n.id) === String(l.source.id) || n.id === l.source.id
                );
            });
            const targetVisible = filteredNodes.some((n) => {
                return (
                    String(n.id) === String(l.target.id) || n.id === l.target.id
                );
            });
            if (!sourceVisible || !targetVisible) return false;

            // 如果边的合作论文列表存在，检查是否在当前筛选范围内
            if (l.papers && l.papers.length > 0) {
                // l.papers 可能是 DOI 字符串数组或论文对象数组
                const hasVisiblePaper = l.papers.some((p: any) => {
                    if (typeof p === 'string') {
                        // 如果是 DOI 字符串，直接匹配
                        return allPapers.some(
                            (paper) =>
                                paper.DOI === p || getPaperId(paper) === p,
                        );
                    } else {
                        // 如果是论文对象，使用 getPaperId 匹配
                        return currentPaperIds.has(getPaperId(p));
                    }
                });
                return hasVisiblePaper;
            }
            // 如果边没有papers列表，只要两端节点可见就显示
            return true;
        });

        return { nodes: filteredNodes, links: filteredLinks };
    }, [allPapers, allNodes, allLinks]);

    const drawNetwork = useCallback(() => {
        if (!containerRef.current) return;

        const { nodes, links } = currentNetworkData;

        // 如果没有节点，显示提示信息
        if (nodes.length === 0) {
            const container = d3.select(containerRef.current);
            container.selectAll('*').remove();
            container
                .append('div')
                .style('width', '100%')
                .style('height', '100%')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('justify-content', 'center')
                .style('color', '#999')
                .text('当前筛选条件下无网络数据');
            return;
        }

        const container = d3.select(containerRef.current);
        container.selectAll('svg').remove();

        // --- SVG 初始化 ---
        const auSvg = container
            .append('svg')
            .attr('viewBox', `0 0 ${AU_SIZE} ${AU_SIZE}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('height', '100%')
            .style('display', 'block')
            .style('background', '#fafafa'); // 添加浅灰色背景，便于看到SVG边界

        // 📌 Tooltip 容器
        if (!tooltipRef.current) {
            tooltipRef.current = d3
                .select('body')
                .append('div')
                .attr('class', 'network-tooltip')
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

        const graph_g = auSvg.append('g').attr('id', 'graph_g');

        // 📌 启用 Zoom/Pan
        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 8])
            .on('zoom', (event) => {
                graph_g.attr('transform', event.transform);
                // 确保 Brush 区域也随之缩放/平移，但 Brush 行为本身不应该被缩放
                // 实际上，D3 Brush 的坐标是相对于其父元素，所以我们只对 graph_g 整体应用 transform。
            });

        auSvg.call(zoom);

        const radiusScale = d3
            .scaleSqrt()
            .domain([1, d3.max(allNodes, (d) => d.paper.length) || 1]) // 使用所有节点的域，确保颜色一致
            .range([4, 20]);

        // 使用更美观的颜色方案
        const colorScale = d3
            .scaleSequential(d3.interpolateViridis)
            .domain([1, d3.max(allNodes, (d) => d.paper.length) || 1]);

        // 创建渐变定义
        const defs = auSvg.append('defs');

        // 节点渐变
        const nodeGradient = defs
            .append('radialGradient')
            .attr('id', 'nodeGradient')
            .attr('cx', '30%')
            .attr('cy', '30%');
        nodeGradient
            .append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#4A90E2')
            .attr('stop-opacity', 1);
        nodeGradient
            .append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#2E5C8A')
            .attr('stop-opacity', 1);

        // 边渐变
        const linkGradient = defs
            .append('linearGradient')
            .attr('id', 'linkGradient');
        linkGradient
            .append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#B0B0B0')
            .attr('stop-opacity', 0.4);
        linkGradient
            .append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#E0E0E0')
            .attr('stop-opacity', 0.2);

        // 添加阴影滤镜
        const filter = defs
            .append('filter')
            .attr('id', 'nodeShadow')
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
            .attr('dx', 1)
            .attr('dy', 1)
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

        // 1. 绘制连线（使用更柔和的样式）
        const linkElements = graph_g
            .append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', '#B8B8B8')
            .attr('stroke-opacity', 0.3)
            .attr('stroke-width', (d) => Math.sqrt(d.value) * 0.8)
            .attr('x1', (d) => d.source.x)
            .attr('y1', (d) => d.source.y)
            .attr('x2', (d) => d.target.x)
            .attr('y2', (d) => d.target.y)
            .style('transition', 'all 0.3s ease')

            // 📌 边悬停交互
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .attr('stroke', '#FF6B6B')
                    .attr('stroke-opacity', 0.8)
                    .attr('stroke-width', Math.sqrt(d.value) * 1.5);
                tooltip
                    .html(
                        `<div style="font-weight: bold; margin-bottom: 4px;">合作论文数: ${d.value}</div>`,
                    )
                    .style('visibility', 'visible')
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY + 10}px`);
            })
            .on('mouseout', function (event, d) {
                // 恢复默认颜色，但如果高亮，保持高亮
                const linkData = d as LinkDatum;
                const isHighlighted = highlightedPapers.some((p) =>
                    linkData.papers.some((lp) => isSamePaper(lp, p)),
                );
                d3.select(this)
                    .attr('stroke', isHighlighted ? '#FFD700' : '#B8B8B8')
                    .attr('stroke-opacity', isHighlighted ? 0.7 : 0.3)
                    .attr(
                        'stroke-width',
                        isHighlighted
                            ? Math.sqrt(linkData.value) * 1.2
                            : Math.sqrt(linkData.value) * 0.8,
                    );
                tooltip.style('visibility', 'hidden');
            })
            // 📌 边点击交互: 筛选出该边合作的论文列表
            .on('click', function (event, d) {
                // 设置高亮和详情
                onLiteratureClick(
                    d.papers,
                    d.papers.length > 0 ? d.papers[0] : null,
                );
            });

        // 2. 绘制节点（使用渐变和阴影）
        const nodeElements = graph_g
            .append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('cx', (d) => d.x)
            .attr('cy', (d) => d.y)
            .attr('r', (d) => radiusScale(d.paper.length))
            .attr('fill', (d) => colorScale(d.paper.length))
            .attr('opacity', 0.85)
            .attr('filter', 'url(#nodeShadow)')
            .style('cursor', 'pointer')
            .style('transition', 'all 0.2s ease')

            // 📌 节点悬停交互
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .attr('stroke', '#FF6B6B')
                    .attr('stroke-width', 3)
                    .attr('opacity', 1)
                    .attr('r', radiusScale(d.paper.length) * 1.3);
                const authorName = d.name || String(d.id || '未知作者');
                tooltip
                    .html(
                        `
                    <div style="font-weight: bold; margin-bottom: 4px; color: #FF6B6B;">${authorName}</div>
                    <div style="color: #666;">论文数: ${
                        d.paper?.length || 0
                    }</div>
                `,
                    )
                    .style('visibility', 'visible')
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY + 10}px`);
            })
            .on('mouseout', function (event, d) {
                // 恢复默认，但如果高亮，保持高亮
                const nodeData = d as NodeDatum;
                // nodeData.paper 是 DOI 字符串数组，需要与 highlightedPapers 中的论文匹配
                const isHighlighted = highlightedPapers.some((p) => {
                    const paperId = getPaperId(p);
                    return nodeData.paper.some((doi: string) => {
                        return doi === paperId || doi === p.DOI;
                    });
                });
                if (!isHighlighted) {
                    d3.select(this)
                        .attr('stroke', null)
                        .attr('stroke-width', 0)
                        .attr('opacity', 0.85)
                        .attr('r', radiusScale(d.paper.length));
                } else {
                    d3.select(this)
                        .attr('stroke', '#FFD700')
                        .attr('stroke-width', 3)
                        .attr('opacity', 1)
                        .attr('r', radiusScale(d.paper.length));
                }
                tooltip.style('visibility', 'hidden');
            })
            // 📌 节点点击交互: 筛选该作者的所有论文，并设置高亮
            .on('click', function (event, d) {
                event.stopPropagation();
                if (enableSelection) return;
                const nodeData = d as NodeDatum;
                // nodeData.paper 是 DOI 字符串数组，需要转换为论文对象
                const authorPaperDOIs = nodeData.paper || [];
                // 从 allPapers 中找到匹配的论文对象
                const authorPapers = allPapers.filter((p) => {
                    const paperId = getPaperId(p);
                    return authorPaperDOIs.some(
                        (doi: string) => doi === paperId || doi === p.DOI,
                    );
                });

                // 1. 设置高优先级筛选结果 (显示该作者的所有论文)
                onLiteratureFilter(authorPapers);
                // 2. 设置高亮和详情（如果提供了回调）
                if (onLiteratureClick && authorPapers.length > 0) {
                    onLiteratureClick(authorPapers, authorPapers[0]);
                }
                // 3. 确保 UI 清除旧的选中/框选样式，并高亮当前点击的节点
                nodeElements
                    .attr('stroke', null)
                    .attr('stroke-width', 0)
                    .attr('opacity', 0.85)
                    .attr('r', (d) => radiusScale(d.paper.length));
                d3.select(this)
                    .attr('stroke', '#FF6B6B')
                    .attr('stroke-width', 4)
                    .attr('opacity', 1)
                    .attr('r', radiusScale(d.paper.length) * 1.2);
            });

        // 3. 实时更新高亮状态
        const updateHighlights = () => {
            // 节点高亮
            nodeElements.each(function (d) {
                const nodeData = d as NodeDatum;
                // nodeData.paper 是 DOI 字符串数组
                const isHighlighted = highlightedPapers.some((p) => {
                    const paperId = getPaperId(p);
                    return nodeData.paper.some((doi: string) => {
                        return doi === paperId || doi === p.DOI;
                    });
                });
                if (isHighlighted) {
                    d3.select(this)
                        .attr('stroke', '#FFD700')
                        .attr('stroke-width', 3)
                        .attr('opacity', 1)
                        .attr('r', radiusScale(d.paper.length) * 1.1);
                } else {
                    // 只有在不是选中状态时才清除
                    const isSelected =
                        d3.select(this).attr('stroke') === '#FF6B6B';
                    if (!isSelected) {
                        d3.select(this)
                            .attr('stroke', null)
                            .attr('stroke-width', 0)
                            .attr('opacity', 0.85)
                            .attr('r', radiusScale(d.paper.length));
                    }
                }
            });

            // 边高亮
            linkElements.each(function (d) {
                const linkData = d as LinkDatum;
                // linkData.papers 可能是 DOI 字符串数组或论文对象数组
                const isHighlighted = highlightedPapers.some((p) => {
                    const paperId = getPaperId(p);
                    return linkData.papers.some((lp: any) => {
                        if (typeof lp === 'string') {
                            // 如果是 DOI 字符串
                            return lp === paperId || lp === p.DOI;
                        } else {
                            // 如果是论文对象
                            return isSamePaper(lp, p);
                        }
                    });
                });
                if (isHighlighted) {
                    d3.select(this)
                        .attr('stroke', 'gold')
                        .attr('stroke-width', Math.sqrt(linkData.value) * 1.5);
                } else {
                    d3.select(this)
                        .attr('stroke', '#999')
                        .attr('stroke-width', Math.sqrt(linkData.value));
                }
            });
        };
        updateHighlights();

        // --- Brush (框选) 逻辑 ---
        // 将 Brush 放在 graph_g 外面，避免受到 zoom transform 的影响
        const brushGroup = auSvg
            .append('g')
            .attr('class', 'brush')
            .style('pointer-events', enableSelection ? 'all' : 'none');

        const brush = d3
            .brush()
            .extent([
                [0, 0],
                [AU_SIZE, AU_SIZE],
            ])
            .on('start', function (event) {
                // 框选开始时，暂时禁用 zoom
                if (enableSelection) {
                    auSvg.on('.zoom', null);
                }
            })
            .on('end', function (event) {
                if (!enableSelection) {
                    // 恢复 zoom
                    auSvg.call(zoom);
                    return;
                }

                // 恢复 zoom
                auSvg.call(zoom);

                if (!event.selection) {
                    onLiteratureFilter([]);
                    return;
                }

                const [[x0, y0], [x1, y1]] = event.selection as [
                    [number, number],
                    [number, number],
                ];

                // 获取当前的 zoom transform
                const transform = d3.zoomTransform(auSvg.node() as Element);

                // 将 brush 坐标转换为数据坐标（考虑 zoom transform）
                const invertedX0 = (x0 - transform.x) / transform.k;
                const invertedY0 = (y0 - transform.y) / transform.k;
                const invertedX1 = (x1 - transform.x) / transform.k;
                const invertedY1 = (y1 - transform.y) / transform.k;

                // 确保顺序正确
                const minX = Math.min(invertedX0, invertedX1);
                const maxX = Math.max(invertedX0, invertedX1);
                const minY = Math.min(invertedY0, invertedY1);
                const maxY = Math.max(invertedY0, invertedY1);

                const selectedNodes = nodes.filter(
                    (d) =>
                        minX <= d.x &&
                        d.x <= maxX &&
                        minY <= d.y &&
                        d.y <= maxY,
                );

                // 1. 设置高优先级筛选结果 (筛选这些作者的所有论文)
                // node.paper 是 DOI 字符串数组，需要转换为论文对象
                const selectedPaperDOIs = selectedNodes.flatMap(
                    (node) => node.paper || [],
                );
                const selectedPapers = allPapers.filter((p) => {
                    const paperId = getPaperId(p);
                    return selectedPaperDOIs.some(
                        (doi: string) => doi === paperId || doi === p.DOI,
                    );
                });
                onLiteratureFilter(selectedPapers);

                // 2. 高亮选中的节点 (边不变)
                nodeElements
                    .attr('stroke', null)
                    .attr('stroke-width', 0)
                    .attr('opacity', 0.85)
                    .attr('r', (d) => radiusScale(d.paper.length));
                nodeElements
                    .filter(
                        (d) =>
                            minX <= d.x &&
                            d.x <= maxX &&
                            minY <= d.y &&
                            d.y <= maxY,
                    )
                    .attr('stroke', '#FF6B6B')
                    .attr('stroke-width', 4)
                    .attr('opacity', 1)
                    .attr('r', (d) => radiusScale(d.paper.length) * 1.15);
            });

        brushGroup.call(brush);

        // 控制 Brush 交互
        if (!enableSelection) {
            brushGroup.call(brush.move, null).style('pointer-events', 'none');
            nodeElements.attr('stroke', null).attr('stroke-width', 0); // 清除选中/框选
        } else {
            brushGroup.style('pointer-events', 'all');
            nodeElements.attr('stroke', null).attr('stroke-width', 0); // 确保启用框选时清除点击高亮
        }
    }, [
        currentNetworkData,
        onLiteratureFilter,
        highlightedPapers,
        onLiteratureClick,
        enableSelection,
        allPapers,
        allNodes,
    ]);

    // 重新绘制，依赖于数据和高亮状态
    useEffect(() => {
        drawNetwork();
    }, [drawNetwork, highlightedPapers]);

    return (
        <div className="chart-container" style={{ background: '#fff' }}>
            <div
                style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 100,
                }}
            >
                <Button
                    type={enableSelection ? 'primary' : 'default'}
                    onClick={() => setEnableSelection((prev) => !prev)}
                    size="small"
                >
                    {enableSelection
                        ? '退出框选 (点击节点)'
                        : '启用框选 (拖拽选择)'}
                </Button>
            </div>
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100%', minHeight: '200px' }}
            ></div>
        </div>
    );
};

export default Network;
