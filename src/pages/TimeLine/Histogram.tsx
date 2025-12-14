import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface HistogramProps {
    data: Array<{ year: number; count: number }>;
    xScale: d3.ScaleTime<number, number>;
    height: number;
    margin: { left: number; right: number; top: number; bottom: number };
}

const Histogram: React.FC<HistogramProps> = ({
    data,
    xScale,
    height,
    margin,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = svgRef.current.clientWidth;
        const chartHeight = height - margin.top - margin.bottom;

        // Y轴比例尺
        const y = d3
            .scaleLinear()
            .domain([0, d3.max(data, (d) => d.count) || 0])
            .range([chartHeight, 0])
            .nice();

        // 创建条形图
        const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // 绘制条形
        g.selectAll('.bar')
            .data(data)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', (d) => xScale(new Date(d.year, 0, 1)))
            .attr(
                'width',
                ((width - margin.left - margin.right) / data.length) * 0.8,
            )
            .attr('y', (d) => y(d.count))
            .attr('height', (d) => chartHeight - y(d.count))
            .attr('fill', '#4A90E2')
            .attr('opacity', 0.7)
            .attr('rx', 2)
            .attr('ry', 2);

        // 绘制Y轴
        g.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .selectAll('text')
            .style('font-size', '10px')
            .style('fill', '#666');

        // 绘制X轴（使用传入的xScale）
        g.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(
                d3
                    .axisBottom(xScale)
                    .ticks(d3.timeYear.every(2), d3.timeFormat('%Y')),
            )
            .selectAll('text')
            .style('font-size', '10px')
            .style('fill', '#666');
    }, [data, xScale, height, margin]);

    return (
        <svg
            ref={svgRef}
            style={{
                width: '100%',
                height: `${height}px`,
                display: 'block',
            }}
        />
    );
};

export default Histogram;
