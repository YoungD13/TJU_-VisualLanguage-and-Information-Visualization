import React, {
    useEffect,
    useRef,
    useState,
    useMemo,
    useCallback,
} from 'react';
import * as d3 from 'd3';
import { useModel } from 'umi';
import './Timeline.less';
import Histogram from './Histogram';
import { Switch, Alert } from 'antd';

// 定义数据类型
interface LiteratureNode {
    Year: number;
    date: Date;
    Conference?: string;
    Award?: string;
    Title?: string;
    PaperId?: string;
    DOI?: string;
    ['AuthorNames-Dedpuped']?: string[];
    [key: string]: any;
}

interface TimeLineProps {
    globalFilters?: any; // 来自index.tsx的全局筛选
    filters?: any; // 兼容旧版本
    reset?: boolean;
    allPapers?: any[]; // 来自index.tsx的基础筛选列表
    onLiteratureFilter: (nodes: LiteratureNode[]) => void;
    highlightedPapers?: any[]; // 需要高亮的论文列表
    onLiteratureClick?: (papers: any[], selectedItem: any | null) => void; // 点击文献点时的回调
}

const TimeLine: React.FC<TimeLineProps> = ({
    globalFilters,
    filters: filtersProp,
    reset = false,
    allPapers,
    onLiteratureFilter,
    highlightedPapers = [],
    onLiteratureClick,
}) => {
    // 兼容处理：优先使用globalFilters，否则使用filters
    const filters = globalFilters || filtersProp || {};
    // 假设 useModel('test') 提供了 s1Data.nodes
    const { s1Data } = useModel('test') || { s1Data: { nodes: [] } };
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [startYear, setStartYear] = useState<number | null>(null);
    const [endYear, setEndYear] = useState<number | null>(null);
    const [showHistogram, setShowHistogram] = useState(false);
    const margin = { left: 50, right: 50, top: 50, bottom: 50 };

    const parseDate = d3.timeParse('%Y');

    // 1. 预处理数据和全局筛选
    // 优先使用 allPapers（来自 index.tsx），如果没有则使用 s1Data.nodes
    const dataSource = allPapers || s1Data?.nodes || [];

    const filteredByGlobalFilters: LiteratureNode[] = useMemo(() => {
        if (!dataSource || dataSource.length === 0)
            return [] as LiteratureNode[];
        return dataSource
            .filter((d: any) => {
                const year = parseInt(d.Year);
                if (isNaN(year)) return false;

                // 应用全局筛选
                const matchesConference = filters.conference
                    ? d.Conference?.toLowerCase().includes(
                          filters.conference.toLowerCase(),
                      )
                    : true;
                const matchesAward = filters.award
                    ? d.Award?.toLowerCase().includes(
                          filters.award.toLowerCase(),
                      )
                    : true;
                const matchesTitle = filters.title
                    ? d.Title?.toLowerCase().includes(
                          filters.title.toLowerCase(),
                      )
                    : true;
                const matchesAuthor = filters.author
                    ? Array.isArray(d['AuthorNames-Dedpuped'])
                        ? d['AuthorNames-Dedpuped'].some((author: string) =>
                              author
                                  .toLowerCase()
                                  .includes(filters.author.toLowerCase()),
                          )
                        : false
                    : true;
                const matchesStartYear = filters.startYear
                    ? year >= filters.startYear
                    : true;
                const matchesEndYear = filters.endYear
                    ? year <= filters.endYear
                    : true;

                return (
                    matchesConference &&
                    matchesAward &&
                    matchesTitle &&
                    matchesAuthor &&
                    matchesStartYear &&
                    matchesEndYear
                );
            })
            .map((d: any) => ({
                ...d,
                Year: parseInt(d.Year),
                date: parseDate(d.Year.toString())!,
            }));
    }, [dataSource, filters]);

    // 2. 应用时间轴自身的选中状态
    const filteredNodes = useMemo(() => {
        let nodes = filteredByGlobalFilters;

        if (selectedYear) {
            nodes = nodes.filter(
                (d: { Year: number }) => d.Year === selectedYear,
            );
        } else if (startYear && endYear) {
            nodes = nodes.filter(
                (d: { Year: number }) =>
                    d.Year >= startYear && d.Year <= endYear,
            );
        }

        return nodes;
    }, [filteredByGlobalFilters, selectedYear, startYear, endYear]);

    // 3. 核心：将时间轴的筛选结果传给父组件
    useEffect(() => {
        onLiteratureFilter(filteredNodes);
    }, [filteredNodes, onLiteratureFilter]);

    // 重置逻辑
    useEffect(() => {
        if (reset) {
            setSelectedYear(null);
            setStartYear(null);
            setEndYear(null);
        }
    }, [reset]);

    // 新增：计算高亮的文献ID集合
    const highlightedPaperIds = useMemo(() => {
        if (highlightedPapers.length === 0) return new Set<string>();
        return new Set(
            highlightedPapers.map((p) => p.PaperId || p.DOI || p.Title),
        );
    }, [highlightedPapers]);

    // 4. D3 绘图逻辑
    const drawTimeLine = useCallback(
        (data: LiteratureNode[]) => {
            if (!svgRef.current || data.length === 0 || showHistogram) return;

            const svg = d3.select(svgRef.current);
            svg.selectAll('*').remove();

            const width = svgRef.current.clientWidth;
            const height = svgRef.current.clientHeight;

            const x = d3
                .scaleTime()
                .domain(d3.extent(data, (d) => d.date) as [Date, Date])
                .range([margin.left, width - margin.right])
                .nice();

            const y = d3
                .scalePoint()
                .domain(
                    Array.from(
                        new Set(
                            data
                                .map((d) => d.Conference)
                                .filter((c) => c && c !== ''),
                        ),
                    ),
                ) // 过滤空值
                .range([height - margin.bottom, margin.top])
                .padding(1);

            // 创建 X 轴
            svg.append('g')
                .attr('transform', `translate(0,${height - margin.bottom})`)
                .call(
                    d3
                        .axisBottom(x)
                        .ticks(d3.timeYear.every(2), d3.timeFormat('%Y')),
                );

            // 创建 Y 轴（会议）
            svg.append('g')
                .attr('transform', `translate(${margin.left},0)`)
                .call(d3.axisLeft(y));

            // 绘制时间轴线
            svg.append('line')
                .attr('x1', margin.left)
                .attr('y1', height - margin.bottom)
                .attr('x2', width - margin.right)
                .attr('y2', height - margin.bottom)
                .attr('stroke', '#ccc');

            // 绘制时间轴上的点
            const points = svg
                .append('g')
                .selectAll('circle')
                .data(data)
                .join('circle')
                .attr('cx', (d) => x(d.date))
                .attr('cy', (d) => y(d.Conference) as number)
                .attr('r', (d) => {
                    const paperId = d.PaperId || d.DOI || d.Title;
                    return highlightedPaperIds.has(paperId) ? 8 : 5;
                })
                .attr('opacity', (d) => {
                    const paperId = d.PaperId || d.DOI || d.Title;
                    return highlightedPaperIds.has(paperId) ? 1.0 : 0.8;
                })
                .attr('fill', (d) => {
                    const paperId = d.PaperId || d.DOI || d.Title;
                    return highlightedPaperIds.has(paperId)
                        ? '#ff4d4f'
                        : 'steelblue';
                })
                .style('cursor', 'pointer')
                .on('click', (event, d) => {
                    event.stopPropagation();
                    // 如果提供了onLiteratureClick回调，则调用它
                    if (onLiteratureClick) {
                        onLiteratureClick([d], d);
                    }
                    // 单击选中单个年份，清除范围选中
                    setSelectedYear(d.Year);
                    setStartYear(null);
                    setEndYear(null);
                });

            // 绘制 Brush 区域 (用于范围选择)
            const brush = d3
                .brushX()
                .extent([
                    [margin.left, margin.top],
                    [width - margin.right, height - margin.bottom],
                ])
                .on('end', (event) => {
                    if (!event.selection) {
                        setStartYear(null);
                        setEndYear(null);
                        setSelectedYear(null);
                        return;
                    }
                    const [x0, x1] = (event.selection as [number, number]).map(
                        x.invert,
                    );
                    setStartYear(x0.getFullYear());
                    setEndYear(x1.getFullYear());
                    setSelectedYear(null);
                });

            svg.append('g').attr('class', 'brush').call(brush);
        },
        [margin, highlightedPaperIds, onLiteratureClick, showHistogram],
    );

    useEffect(() => {
        if (filteredByGlobalFilters.length > 0) {
            drawTimeLine(filteredByGlobalFilters);
        }
        // 当切换到直方图时清空散点图区域
        if (showHistogram && svgRef.current) {
            d3.select(svgRef.current).selectAll('*').remove();
        }
    }, [filteredByGlobalFilters, drawTimeLine, showHistogram]);

    // 直方图数据准备和比例尺创建
    const histogramData = useMemo(() => {
        if (!filteredByGlobalFilters || filteredByGlobalFilters.length === 0)
            return [];
        const yearCounts = d3.rollup(
            filteredByGlobalFilters,
            (v) => v.length,
            (d: any) => d.Year,
        );
        return Array.from(yearCounts, ([year, count]) => ({ year, count }));
    }, [filteredByGlobalFilters]);

    const histogramXScale = useMemo(() => {
        if (filteredByGlobalFilters.length === 0 || !svgRef.current)
            return null;
        return d3
            .scaleTime()
            .domain(
                d3.extent(
                    filteredByGlobalFilters,
                    (d) => d.date,
                ) as unknown as [Date, Date],
            )
            .range([margin.left, svgRef.current.clientWidth - margin.right])
            .nice();
    }, [filteredByGlobalFilters, margin.left, margin.right]);

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={{ marginBottom: 8, flexShrink: 0 }}>
                <Switch
                    checked={showHistogram}
                    onChange={setShowHistogram}
                    checkedChildren="隐藏直方图"
                    unCheckedChildren="显示直方图"
                    size="small"
                />
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
                {showHistogram && histogramXScale && (
                    <Histogram
                        data={histogramData}
                        xScale={histogramXScale}
                        height={100}
                        margin={{
                            left: margin.left,
                            right: margin.right,
                            top: 10,
                            bottom: 20,
                        }}
                    />
                )}

                <svg
                    ref={svgRef}
                    style={{
                        width: '100%',
                        height: showHistogram ? 0 : '100%',
                        display: showHistogram ? 'none' : 'block',
                    }}
                />
            </div>

            {filteredByGlobalFilters.length === 0 && (
                <Alert
                    message="当前全局筛选条件下无数据"
                    type="warning"
                    showIcon
                    style={{ marginTop: '10px' }}
                />
            )}
        </div>
    );
};

export default TimeLine;
