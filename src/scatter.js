async function drawScatter() {
    // 1. Access data
    const dataset = await d3.json("./data/my_weather_data.json")

    // set data constants
    // Get data attributes, i.e. yAccessor for max temperature and xAccessor for min temperature 
    const yAccessor = d => d.temperatureMax
    const xAccessor = d => d.temperatureMin

    const colorScaleYear = 2000
    const parseDate = d3.timeParse("%Y-%m-%d")
    const formatMonth = d3.timeFormat("%m")
    const colorAccessor = d => formatMonth(parseDate(d.date))
    // const colorAccessor = d => parseDate(d.date).setYear(colorScaleYear)

    // Create chart dimensions
    const width = d3.min([
        window.innerWidth,
        window.innerHeight,
    ])

    let dimensions = {
        width: width,
        height: width,
        margin: {
            top: 90,
            right: 90,
            bottom: 50,
            left: 50,
        },
        legendWidth: 250,
        legendHeight: 26,
    }

    dimensions.boundedWidth = dimensions.width
        - dimensions.margin.left
        - dimensions.margin.right
    dimensions.boundedHeight = dimensions.height
        - dimensions.margin.top
        - dimensions.margin.bottom

    // Draw 
    const wrapper = d3.select("#wrapper")
        .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

    // For scatterplot
    const bounds = wrapper.append("g")
        .style("transform", `translate(${
            dimensions.margin.left
        }px, ${
            dimensions.margin.top
        }px)`)

    const boundsBackground = bounds.append("rect")
        .attr("class", "bounds-background")
        .attr("x", 0)
        .attr("width", dimensions.boundedWidth)
        .attr("y", 0)
        .attr("height", dimensions.boundedHeight)

    // For min temp marginal distribution
    const svgMin = wrapper.append("g")
        .style("transform", `translate(${dimensions.margin.left}px, 0px`)

    // For max temp marginal distribution
    const svgMax = wrapper.append("g")
        .style("transform", `translate(${dimensions.margin.left + dimensions.boundedWidth}px, ${dimensions.margin.top}px`)

    // Create scales
    // Create scales for x, y, and color (i.e., xScale, yScale, and colorScale)
    // For scatterplot
    const xScale = d3.scaleLinear()
        .domain([0, Math.round(d3.max(dataset, d => xAccessor(d)) / 100) * 100])
        .range([0, dimensions.boundedWidth])

    const yScale = d3.scaleLinear()
        .domain([0, Math.round(d3.max(dataset, d => yAccessor(d)) / 100) * 100])
        .range([dimensions.boundedHeight, 0])

    const colorScale = d3.scaleOrdinal()
        .domain([1, d3.max(dataset, d => colorAccessor(d))])
        .range(["#2196f3", "#212bf3", "#7f21f3", "#e821f3", "#f32194", "#f3212b", "#f37f21", "#f3e821", "#94f321", "#2bf321", "#21f380", "#21f3e8"])
        // .range(["#7540aa", "#6847b1", "#4e6bd4", "#2ba2d4", "#23cfb0", "#43ee7b", "#83f155", "#c3d53c", "#f19d38", "#ff6c59", "#ea4b89", "#b93dac"])

    // For marginal distribution
    const xScaleDistMin = xScale

    const yScaleDistMin = d3.scaleLinear()
        .domain([0, 0.03])
        .range([dimensions.margin.top, 0])

    const xScaleDistMax = d3.scaleLinear()
        .domain([0, 0.03])
        .range([0, dimensions.margin.right])

    const yScaleDistMax = yScale

    // Density computation
    function kernelDensityEstimator(kernel, X) {
        return function(V) {
            return X.map(function(x) {
                return [x, d3.mean(V, function(v) {return kernel(x - v)})]
            })
        }
    }

    function kernelEpanechnikov(k) {
        return function(v) {
            return (Math.abs(v /= k) <= 1) ? (0.75 * (1 - v * v) / k) : 0
        }
    }

    // 5. Draw data 
    // Draw data into a scatter plot
    const dotsGroup = bounds.selectAll('circle')
        .data(dataset)
        .join('circle')
            .attr('class', 'point')
            .attr('r', 3)
            .attr('cy', d => yScale(yAccessor(d)))
            .attr('cx', d => xScale(xAccessor(d)))
            .style('fill', d => colorScale(colorAccessor(d)))

    // Marginal distribution for minimum temperature
    const kdeMin = kernelDensityEstimator(kernelEpanechnikov(7), xScaleDistMin.ticks(50))
    const densityMin = kdeMin(dataset.map(function(d) {return d.temperatureMin}))

    const areaMin = d3.area()
        .curve(d3.curveBasis)
        .x(function(d) {return xScaleDistMin(d[0])})
        .y0(dimensions.margin.top)  // Lower bound
        .y1(function(d) {return yScaleDistMin(d[1])}) // Upper bound

    svgMin.append("path")
        .attr("class", "mypath")
        .datum(densityMin)
        .attr("fill", "grey")
        .attr("opacity", "0.35")
        .attr("d",  areaMin)

    // Marginal distribution for maximum temperature
    const kdeMax = kernelDensityEstimator(kernelEpanechnikov(7), yScaleDistMax.ticks(50))
    const densityMax =  kdeMax(dataset.map(function(d){return d.temperatureMax}))

    const areaMax = d3.area()
        .curve(d3.curveBasis)
        .x0(0)  // Lower bound
        .x1(function(d) {return xScaleDistMax(d[1])}) // Upper bound
        .y(function(d) {return yScaleDistMax(d[0])})

    svgMax.append("path")
        .datum(densityMax)
        .attr("class", "mypath")
        .attr("fill", "grey")
        .attr("opacity", "0.35")
        .attr("d",  areaMax)

    // 6. Draw peripherals
    const xAxisGenerator = d3.axisBottom()
        .scale(xScale)
        .ticks(4)

    const xAxis = bounds.append("g")
        .call(xAxisGenerator)
        .style("transform", `translateY(${dimensions.boundedHeight}px)`)

    const xAxisLabel = xAxis.append("text")
        .attr("class", "x-axis-label")
        .attr("x", dimensions.boundedWidth / 2)
        .attr("y", dimensions.margin.bottom - 10)
        .html("Minimum Temperature (&deg;F)")

    const yAxisGenerator = d3.axisLeft()
        .scale(yScale)
        .ticks(4)

    const yAxis = bounds.append("g")
        .call(yAxisGenerator)

    const yAxisLabel = yAxis.append("text")
        .attr("class", "y-axis-label")
        .attr("x", -dimensions.boundedHeight / 2)
        .attr("y", -dimensions.margin.left + 10)
        .html("Maximum Temperature (&deg;F)")

    // Create gradient
    const defs = wrapper.append("defs")

    const numberOfGradientStops = 10
    const stops = d3.range(numberOfGradientStops).map(i => (
        i / (numberOfGradientStops - 1)
    ))

    const legendGradientId = "legend-gradient"
    const gradient = defs.append("linearGradient")
        .attr("id", legendGradientId)
        .selectAll("stop")
        .data(stops)
        .join("stop")
        .attr("stop-color", d => d3.interpolateRainbow(d))
        .attr("offset", d => `${d * 100}%`)

    const tickValues = [
        d3.timeParse("%m/%d/%Y")(`4/1/${colorScaleYear}`),
        d3.timeParse("%m/%d/%Y")(`7/1/${colorScaleYear}`),
        d3.timeParse("%m/%d/%Y")(`10/1/${colorScaleYear}`),
    ]

    const legendTickScale = d3.scaleLinear()
        .domain(colorScale.domain())
        .range([0, dimensions.legendWidth])
    
    const legendGroup = bounds.append("g")
        .attr("transform", `translate(${
            dimensions.boundedWidth - dimensions.legendWidth - 9
        },${
            dimensions.boundedHeight - 37
        })`)

    const legendGradient = legendGroup.append("rect")
        .attr("height", dimensions.legendHeight)
        .attr("width", dimensions.legendWidth)
        .style("fill", `url(#${legendGradientId})`)

    const legendValues = legendGroup.selectAll(".legend-value")
        .data(tickValues)
        .join("text")
            .attr("class", "legend-value")
            .attr("x", d => legendTickScale(formatMonth(d)))
            .attr("y", -6)
            .text(d3.timeFormat("%b"))

    const legendValueTicks = legendGroup.selectAll(".legend-tick")
        .data(tickValues)
        .join("line")
            .attr("class", "legend-tick")
            .attr("x1", d => legendTickScale(formatMonth(d)))
            .attr("x2", d => legendTickScale(formatMonth(d)))
            .attr("y1", 6)

    // Set up interactions
    // create voronoi for tooltips
    const delaunay = d3.Delaunay.from(
        dataset,
        d => xScale(xAccessor(d)),
        d => yScale(yAccessor(d)),
    )
    const voronoiPolygons = delaunay.voronoi()
    voronoiPolygons.xmax = dimensions.boundedWidth
    voronoiPolygons.ymax = dimensions.boundedHeight

    const voronoi = bounds.append("g").selectAll(".voronoi")
        .data(dataset)
        .join("path")
        .attr("class", "voronoi")
        .attr("d", (d,i) => voronoiPolygons.renderCell(i))

    // add two mouse events in the tooltip
    const tooltip = d3.select("#tooltip")

    const hoverElementsGroup = bounds.append("g")
        .style("opacity", 0)

    const dayDot = hoverElementsGroup.append("circle")
        .attr("class", "tooltip-dot")

    const formatTooltip = d3.timeFormat("%A, %B %d, %Y")

    voronoi.on("mouseenter", onVoronoiMouseEnter)
        .on("mouseleave", onVoronoiMouseLeave)

    function onVoronoiMouseEnter(e, datum) {
        // Given the mouse event and a datum, you are asked to highlight the data by adding an addtioanl circle and display its information (such as date and temperature).
        hoverElementsGroup.style("opacity", 1)

        dayDot.attr('r', 6)
            .attr('cy', yScale(yAccessor(datum)))
            .attr('cx', xScale(xAccessor(datum)))

        tooltip.style("opacity", 1)
        tooltip.select("#date")
            .text(formatTooltip(parseDate(datum.date)))

        tooltip.select("#min-temperature")
            .text(Math.round(xAccessor(datum) * 10) / 10)
        
        tooltip.select("#max-temperature")
            .text(Math.round(yAccessor(datum) * 10) / 10)

        tooltip.style("transform", `translate(${
            xScale(xAccessor(datum)) - 90
        }px, ${
            yScale(yAccessor(datum)) + 25
        }px)`)

        // Show the location on the min temp marginal distribution
        svgMin.append("g").append("rect")
            .attr("class", "density_bar")
            .attr("width", 15)
            .attr("height", dimensions.margin.top)
            .attr("x", xScaleDistMin(xAccessor(datum)))
            .attr("y", 0)
            .style("fill", "skyblue")
            .style("opacity", 0.8)

        // Show the location on the max temp marginal distribution
        svgMax.append("g").append("rect")
            .attr("class", "density_bar")
            .attr("width", dimensions.margin.right)
            .attr("height", 15)
            .attr("x", 0)
            .attr("y", yScaleDistMax(yAccessor(datum)))
            .style("fill", "skyblue")
            .style("opacity", 0.8)
    }

    function onVoronoiMouseLeave() {
        hoverElementsGroup.style("opacity", 0)
        tooltip.style("opacity", 0)
        wrapper.selectAll(".density_bar").remove()
    }

    // add two mouse actions on the legend
    const legendHighlightBarWidth = dimensions.legendWidth * 0.05
    const legendHighlightGroup = legendGroup.append("g")
        .style("opacity", 0)

    const legendHighlightBar = legendHighlightGroup.append("rect")
        .attr("class", "legend-highlight-bar")
        .attr("width", legendHighlightBarWidth)
        .attr("height", dimensions.legendHeight)
        .attr("y", 0)

    const legendHighlightText = legendHighlightGroup.append("text")
        .attr("class", "legend-highlight-text")
        .attr("x", legendHighlightBarWidth / 2)
        .attr("y", -6)
    
    // To listen to the mouse event
    bounds.append("g")
        .attr("transform", `translate(${
            dimensions.boundedWidth - dimensions.legendWidth - 9
        },${
            dimensions.boundedHeight - 37
        })`)
        .append("rect")
            .attr("height", dimensions.legendHeight)
            .attr("width", dimensions.legendWidth)
            .attr("opacity", 0)   // Make the additional rectangle hidden
            .on("mousemove", onLegendMouseMove)
            .on("mouseleave", onLegendMouseLeave)
    
    // Time interval
    const offset = 30

    const legendScale = d3.scaleLinear()
        .domain([584.5 + (legendHighlightBarWidth/2), 584 + dimensions.legendWidth - (legendHighlightBarWidth/2)])
        .range([d3.min(dataset, d => parseDate(d.date)), d3.timeDay.offset(d3.max(dataset, d => parseDate(d.date)), -offset)])

    const formatLegend = d3.timeFormat("%B %d")

    // For marginal distribution
    const yScaleLegendDistMin = d3.scaleLinear()
        .domain([0, 0.03])
        .range([dimensions.margin.top, 80])

    const xScaleLegendDistMax = d3.scaleLinear()
        .domain([0, 0.03])
        .range([0, dimensions.margin.right - 80])

    function onLegendMouseMove(e) {
        // Display the data only when the data are in the selected date range.
        legendValues.style("opacity", 0)
        legendValueTicks.style("opacity", 0)
        legendHighlightGroup.style("opacity", 1)
        dotsGroup.style("opacity", 1)
        wrapper.selectAll(".legendPath").remove()

        let x_pos = e.clientX

        // Make sure that the rectangle is shown fully (no partial highlight bar shown)
        if (x_pos >= 585 && x_pos <= 584.5 + (legendHighlightBarWidth/2)) {
            x_pos = 584.5 + (legendHighlightBarWidth/2)
        }
        else if (x_pos >= 584 + dimensions.legendWidth - (legendHighlightBarWidth/2) && x_pos <= 585 + dimensions.legendWidth) {
            x_pos = 584 + dimensions.legendWidth - (legendHighlightBarWidth/2)
        }

        legendHighlightBar.attr("x", x_pos - 590)
        legendHighlightText.attr("x", x_pos - 585)
        legendHighlightText.text(`${formatLegend(legendScale(x_pos))}
         - ${formatLegend(d3.timeDay.offset(legendScale(x_pos), +offset))}`)

        const isDayWithinRange = d => {
            // Given a datum, judge whether the datum is in a datum range. Return True or False. 
            return ((parseDate(d.date) <= legendScale(x_pos)) || (parseDate(d.date) >= d3.timeDay.offset(legendScale(x_pos), +offset)))
        }

        dotsGroup.classed("not_selected", d => isDayWithinRange(d))
        dotsGroup.classed("selected", d => !isDayWithinRange(d))

        // Hide the data not within the range
        bounds.selectAll(".not_selected").style("opacity", 0.05)

        // For the marginal distribution
        const selected = bounds.selectAll(".selected").nodes()
        // For min temp
        const dataLegendMin = selected.map(d => d.getAttribute("cx")).map(d => xScale.invert(d))
        const densityLegendMin = kdeMin(dataLegendMin)

        const areaLegendMin = d3.area()
            .curve(d3.curveBasis)
            .x(function(d) {return xScaleDistMin(d[0])})
            .y0(dimensions.margin.top)  // Lower bound
            .y1(function(d) {return yScaleLegendDistMin(d[1])}) // Upper bound

        svgMin.append("path")
            .attr("class", "legendPath")
            .datum(densityLegendMin)
            .attr("fill", colorScale(formatMonth((legendScale(x_pos)))))
            .attr("stroke", "white")
            .attr("opacity", "0.7")
            .attr("d",  areaLegendMin)

        // For max temp
        const dataLegendMax = selected.map(d => d.getAttribute("cy")).map(d => yScale.invert(d))
        const densityLegendMax = kdeMin(dataLegendMax)

        const areaLegendMax = d3.area()
            .curve(d3.curveBasis)
            .x0(0)  // Lower bound
            .x1(function(d) {return xScaleLegendDistMax(d[1])})  // Upper bound
            .y(function(d) {return yScaleDistMax(d[0])}) 

        svgMax.append("path")
            .attr("class", "legendPath")
            .datum(densityLegendMax)
            .attr("fill", colorScale(formatMonth((legendScale(x_pos)))))
            .attr("stroke", "white")
            .attr("opacity", "0.7")
            .attr("d",  areaLegendMax)
    }

    function onLegendMouseLeave() {
        dotsGroup.transition().duration(500)
            .style("opacity", 1)

        legendValues.style("opacity", 1)
        legendValueTicks.style("opacity", 1)
        legendHighlightGroup.style("opacity", 0)

        wrapper.selectAll(".legendPath").remove()
    }

}
drawScatter()