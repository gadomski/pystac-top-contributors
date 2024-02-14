// FINAL: Update GitHub explanation

// TODO: Annotations for releases?
// TODO: Annotations / marking for noteworthy contributions
// TODO: Need a bbox simulation to not get overlapping annotations?
// TODO: Add hovers (div?)
// TODO: Zoomable circles?

/////////////////////////////////////////////////////////////////////
/////////////// Visualization designed & developed by ///////////////
/////////////////////////// Nadieh Bremer ///////////////////////////
///////////////////////// VisualCinnamon.com ////////////////////////
/////////////////////////////////////////////////////////////////////
async function createORCAVisual(container) {
    /////////////////////////////////////////////////////////////////
    ///////////////////// CONSTANTS & VARIABLES /////////////////////
    /////////////////////////////////////////////////////////////////

    const PI = Math.PI
    const TAU = PI * 2

    let round = Math.round
    let cos = Math.cos
    let sin = Math.sin
    let min = Math.min
    let max = Math.max
    let sqrt = Math.sqrt

    // Default repo
    let REPO_CENTRAL = "mozilla/pdf.js"

    // Datasets
    let commits
    let commits_by_month

    // Grid
    let row_heights = []

    // Hover options
    let delaunay
    let HOVER_ACTIVE = false
    let HOVERED_NODE = null
    let CLICK_ACTIVE = false
    let CLICKED_NODE = null

    // Drawing
    let INITIAL_CIRCLE_DRAW = true
    let FIRST_DRAW = true

    // Visual variables
    const PADDING = 1.5

    /////////////////////////////////////////////////////////////////
    ///////////////////////////// Colors ////////////////////////////
    /////////////////////////////////////////////////////////////////

    const COLOR_BACKGROUND = "#f7f7f7"

    const COLOR_PURPLE = "#783ce6"

    const COLOR_REPO_MAIN = "#a682e8"
    const COLOR_REPO = "#64d6d3" 
    const COLOR_OWNER = "#f2a900"
    const COLOR_CONTRIBUTOR = "#ea9df5"

    const COLOR_INSERTIONS = "#78ded0"
    const COLOR_DELETIONS = "#f6a2f4"
    const COLOR_OVERLAP = "#4070c4" 

    const COLOR_LINK = "#e8e8e8"
    const COLOR_TEXT = "#4d4950"

    /////////////////////////////////////////////////////////////////
    ///////////////////////// Create Canvas /////////////////////////
    /////////////////////////////////////////////////////////////////

    // Create the three canvases and add them to the container
    const canvas = document.createElement("canvas")
    canvas.id = "canvas"
    const context = canvas.getContext("2d")

    const canvas_hover = document.createElement("canvas")
    canvas_hover.id = "canvas-hover"
    const context_hover = canvas_hover.getContext("2d")

    container.appendChild(canvas)
    container.appendChild(canvas_hover)
    
    // Set some important stylings of each canvas
    container.style.position = "relative"
    container.style["background-color"] = COLOR_BACKGROUND

    styleCanvas(canvas)
    styleCanvas(canvas_hover)

    styleBackgroundCanvas(canvas)

    canvas_hover.style.position = "relative"
    canvas_hover.style.z_index = "1"

    function styleCanvas(canvas) {
        canvas.style.display = "block"
        canvas.style.margin = "0"
    }// function styleCanvas

    function styleBackgroundCanvas(canvas) {
        canvas.style.position = "absolute"
        canvas.style.top = "0"
        canvas.style.left = "0"
        canvas.style.pointer_events = "none"
        canvas.style.z_index = "0"
        canvas.style.transition = "opacity 100ms ease-in"
    }// function styleBackgroundCanvas

    /////////////////////////////////////////////////////////////////
    /////////////////////////// Set Sizes ///////////////////////////
    /////////////////////////////////////////////////////////////////

    //Sizes
    let width = 1500
    let height = 2500
    let WIDTH
    let HEIGHT
    let MARGIN = {width: 0, height: 0}, W, H
    let PIXEL_RATIO

    /////////////////////////////////////////////////////////////////
    //////////////////////// Create Functions ///////////////////////
    /////////////////////////////////////////////////////////////////

    let parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S %Z")
    let formatDate = d3.timeFormat("%b %Y")
    let formatDateNum = d3.timeFormat("%m-%Y")
    let formatGroupMonth = d3.timeFormat("%Y-%m")
    let formatMonth = d3.timeFormat("%b")
    let formatYear = d3.timeFormat("%Y")
    // let formatDateExact = d3.timeFormat("%b %d, %Y")
    // let formatDigit = d3.format(",.2s")
    // let formatDigit = d3.format(",.2r")

    const scale_radius = d3.scalePow()
        .exponent(0.5)
        .range([2.5, 12, 16])
        .clamp(true)

    /////////////////////////////////////////////////////////////////
    //////////////////////// Draw the Visual ////////////////////////
    /////////////////////////////////////////////////////////////////

    async function chart(values) {
        /////////////////////////////////////////////////////////////
        ////////////////////// Data Preparation /////////////////////
        /////////////////////////////////////////////////////////////
        commits = values[0]

        // Initial simple data preparation
        prepareData()

        // Do an initial pass of finding the positions of the commits within each month's circle using circle packing
        // This will give an enclosing circle radius for each month
        // And makes it possible to figure out the timeline positions and total height
        commits_by_month.forEach(d => {
            determineCommitPositions(d, true)
        })//forEach
        chart.resize()
        // Make sure that the initial draw is done
        await delay(0)
        INITIAL_CIRCLE_DRAW = false

        // Find the positions of the commits within each month's circle using a force simulation that creates more visually pleasing circular results
        initialDrawMonthCirclesPerMonth()

        /////////////////////////////////////////////////////////////
        ////////////////////// Setup the Hover //////////////////////
        /////////////////////////////////////////////////////////////
        // setupHover()

        /////////////////////////////////////////////////////////////
        ///////////// Set the Sizes and Draw the Visual /////////////
        /////////////////////////////////////////////////////////////
        // chart.resize()
        // console.log("Done drawing")

    }// function chart

    /////////////////////////////////////////////////////////////////
    //////////////////////// Draw the visual ////////////////////////
    /////////////////////////////////////////////////////////////////

    // This draws the entire visual, with all of the month circles
    function draw() {
        // Draw the background, but only the very first time when the timeline positions have just been determined, or after the "animation" of all the months is done
        if(INITIAL_CIRCLE_DRAW === true || FIRST_DRAW === false) drawBackground(context)

        context.save()
        context.translate(MARGIN.width, MARGIN.height)

        context_hover.clearRect(0, 0, WIDTH, HEIGHT)
        context_hover.save()
        context_hover.translate(MARGIN.width, MARGIN.height)

        // Draw the timeline behind the circles
        if(INITIAL_CIRCLE_DRAW === true || FIRST_DRAW === false) drawTimeLine(context)

        // Draw all the month circles and the commits within
        drawAllCommitMonths(context)

        context.restore()
        context_hover.restore()
    }// function draw

    /////////////////////////////////////////////////////////////////
    //////////////////////// Resize the chart ///////////////////////
    /////////////////////////////////////////////////////////////////
    chart.resize = () => {
        // Screen pixel ratio
        PIXEL_RATIO = window.devicePixelRatio

        WIDTH = round(width * PIXEL_RATIO)
        MARGIN.width = WIDTH * 0.08
        MARGIN.height = Math.max(150, WIDTH * 0.05)
        W = WIDTH - 2 * MARGIN.width

        // Find the positions of each month's circle now that we have the width
        // This will also set the height of the canvas
        determineMonthPositionsAlongTimeline()
        setCommitBasePositions()

        HEIGHT = round(height * PIXEL_RATIO)
        H = HEIGHT - 2 * MARGIN.height

        sizeCanvas(canvas, context)
        sizeCanvas(canvas_hover, context_hover)

        // Size the canvas
        function sizeCanvas(canvas, context) {
            canvas.width = WIDTH
            canvas.height = HEIGHT
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`

            // Some canvas settings
            context.lineJoin = "round" 
            context.lineCap = "round"
        }// function sizeCanvas

        // Reset the delaunay for the mouse events
        if(!FIRST_DRAW) delaunay = d3.Delaunay.from(commits.map(d => [d.x_base, d.y_base]))

        // Draw the visual
        draw()
    }//function resize

    /////////////////////////////////////////////////////////////////
    /////////////////// Data Preparation Functions //////////////////
    /////////////////////////////////////////////////////////////////

    ///////////// Initial easy clean-up and calculations ////////////
    function prepareData() {
        // Convert the strings to numbers and dates
        commits.forEach(d => {
            d.files_changed = +d.files_changed
            d.line_insertions = +d.line_insertions
            d.line_deletions = +d.line_deletions
            d.lines_changed = d.line_insertions + d.line_deletions

            // Time
            d.author_time = parseDate(d.author_time)
            d.commit_time = parseDate(d.commit_time)
            d.commit_month = d.commit_time.getMonth()
            d.commit_year = d.commit_time.getFullYear()
        })// forEach
        // console.log(commits[0])

        // Find quantile numbers of the number of lines changed
        let QUANTILE90 = d3.quantile(commits.filter(d => d.lines_changed > 0), 0.90, d => d.lines_changed)
        let QUANTILE99 = d3.quantile(commits.filter(d => d.lines_changed > 0), 0.99, d => d.lines_changed)
        // Set the radius scale
        scale_radius.domain([0, QUANTILE90, QUANTILE99])
        // console.log(scale_radius.domain())

        // Calculate the Visual variables
        commits.forEach(d => {
            d.radius_insertions = scale_radius(d.line_insertions)
            d.radius_deletions = scale_radius(d.line_deletions)
            d.radius = max(d.radius_insertions, d.radius_deletions)
            // d.radius = scale_radius(d.lines_changed)
            d.radius_draw = d.radius

            // If this commit had a "decorations" that started with "tag: v", it's a release
            d.is_release = d.decorations.startsWith("tag: v")
            // Make the radius bigger to add a stroke around it
            if(d.is_release) {
                if(d.files_changed === 0) d.radius += 20
                else d.radius += 16
                d.radius_draw = scale_radius(0) + (d.is_release ? 3 : 0)
            }// if

        })// forEach

        /////////////////////////////////////////////////////////////
        // Group the commits by month
        commits_by_month = d3.groups(commits, d => formatGroupMonth(d.commit_time))

        // Loop over all the months and save some statistics
        commits_by_month.forEach((d, i) => {
            d.index = i

            // Needed for the initial drawing
            d.opacity = 0
            d.drawn_on_main = false
            d.finished_appearing = false
            d.commit_positions_determined = false
            d.commit_circle_simulation = false
            
            d.values = d[1]
            d.month = d.values[0].commit_month
            d.year = d.values[0].commit_year
            d.n_commits = d.values.length

            let total_files = 0
            let total_insertions = 0
            let total_deletions = 0
            let total_changes = 0
            let authors = new Set()
            d.values.forEach(n => {
                total_files += n.files_changed
                total_insertions += n.line_insertions
                total_deletions += n.line_deletions
                total_changes += n.lines_changed
                authors.add(n.author)
            })// forEach

            d.total_files = total_files
            d.total_insertions = total_insertions
            d.total_deletions = total_deletions
            d.total_changes = total_changes
            d.total_authors = authors.size
        })// forEach

        // Link the commits to their month
        commits_by_month.forEach(d => {
            d.values.forEach(n => {
                n.month_data = d
            })// forEach
        })// forEach
    }// function prepareData

    /////////////////////////////////////////////////////////////////
    /////////////////// General Circle Placements ///////////////////
    /////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////
    // Run all of the functions that together determine the positions of the commits within each month's circle
    function determineCommitPositions(d, DO_INITIAL = false) {
        if(DO_INITIAL) initialCommitCirclePack(d)
        if(!DO_INITIAL) {
            simulationCommitCircles(d)
            d.commit_circle_simulation = true
        }
        if(DO_INITIAL) findEnclosingCircle(d)
        
        d.commit_positions_determined = true
    }// function determineCommitPositions

    /////////////////////////////////////////////////////////////////
    // Do an initial circle pack
    function initialCommitCirclePack(d) {
        d.values.forEach(n => { n.r = n.radius + PADDING })
        d3.packSiblings(d.values)
    }// function initialCommitCirclePack
    
    /////////////////////////////////////////////////////////////////
    //Do a static simulation to create slightly better looking groups
    function simulationCommitCircles(d) {
        const scale_force = d3.scaleLinear()
            .domain([0, 400])
            .range([0.06, 0.01])
            .clamp(true)

        if(d.n_commits < 400) {
            const simulation = d3.forceSimulation(d.values)
                .alphaDecay(1 - Math.pow(0.001, 1 / 200))
                .force("x", d3.forceX(0).strength(scale_force(d.n_commits)))
                .force("y", d3.forceY(0).strength(scale_force(d.n_commits)))
                .force("collide", d3.forceCollide(n => n.radius + PADDING).strength(1))
                .stop()
            for (let i = 0; i < 200; ++i) simulation.tick()
        }// if
    }// function simulationCommitCircles

    /////////////////////////////////////////////////////////////////
    // Find the smallest enclosing circle around all the commit circles
    function findEnclosingCircle(d) {
        const scale_padding = d3.scaleLinear()
            .domain([0, 399, 400])
            .range([2, 5, 12])
            .clamp(true)
        
        // With the locations of the children known, calculate the smallest enclosing circle
        d.values.forEach(n => { n.r = n.radius })
        let parent_circle = d3.packEnclose(d.values)

        d.values.forEach(n => { 
            n.r = n.radius
        })

        //Save the parent radius
        d.r = parent_circle.r + 12 + scale_padding(parent_circle.r)
    }// function findEnclosingCircle

    /////////////////////////////////////////////////////////////////
    /////////////////// Fading in after simulation //////////////////
    /////////////////////////////////////////////////////////////////

    // Do a more refined force simulation for the commit circles within each month
    // Then draw the commit circles per month, slowly increasing the opacity
    function initialDrawMonthCirclesPerMonth(i = 0) {
        if (i < commits_by_month.length) {
            let d = commits_by_month[i]
            // Determine the positions of the commit circles within each month's circle, now also using the force simulation
            determineCommitPositions(d)
            // Save the absolute pixel positions of the commits on the page
            commitBasePosition(d)

            // Slowly increase the opacity of the month circles
            increaseOpacity(i)

            // Draw the visual
            draw()

            // When the last month has run
            if(i === commits_by_month.length-1) {
                // Run the increaseOpacity function a few more times until all the circles are fully visible, by checking that all have an opacity of 1
                increaseFinalOpacities(i+1)
            }// if

            requestAnimationFrame(() => initialDrawMonthCirclesPerMonth(i + 1))
        }// if

    }// function initialDrawMonthCirclesPerMonth

    // Slowly increase the opacity of the month circles with each new month that has been drawn
    function increaseOpacity(i) {
        let index = min(commits_by_month.length-1, i)
        for(let j = 0; j <= index; j++) {
            let d = commits_by_month[j]
            if(d.opacity < 1) d.opacity = min(1, d.opacity + 0.1)
            else d.finished_appearing = true
        }// for j
    }// function increaseOpacity

    // A requestAnimationFrame function to increase the opacity a few more times for all the circles to get to an opacity of 1
    function increaseFinalOpacities(j) {
        increaseOpacity(j)
        let all_finished = commits_by_month.every(d => d.finished_appearing)
        draw()

        if(!all_finished) requestAnimationFrame(() => increaseFinalOpacities(j + 1)) 
        else {
            // Finish the initial draw
            FIRST_DRAW = false
            // Do a final resize
            chart.resize()

            // Setup the hover
            setupHover()
            console.log("Done drawing")
        }// else
    }// function increaseFinalOpacities

    /////////////////////////////////////////////////////////////////
    ///////////// Determine the positions of each month /////////////
    /////////////////////////////////////////////////////////////////
    function determineMonthPositionsAlongTimeline() {
        // Loop over all the months and place them in a grid of N columns
        const padding = 50
        const padding_row = 80
        
        let along_X = 0
        let along_Y = 0
        
        let index = 0
        let row = 0
        let row_index = 0

        let sign = 1

        if(commits_by_month === undefined) return

        /////////////////////////////////////////////////////////////
        // Do a first loop to determine which row and column each month circle is in
        commits_by_month
            .filter(d => d.commit_positions_determined === true)
            .forEach((d,i) => {
                // If the new circle doesn't fit in the current row, go to the next row (except if this is the first circle on the row)
                if(row_index !== 0 && ((sign === 1 && along_X + 2 * d.r > W) || (sign === -1 && along_X - 2 * d.r < 0))) nextColumn()

                d.x = along_X + sign * d.r
                d.y = along_Y

                d.row = row
                row_index++

                along_X = along_X + sign * (2*d.r + padding)

                // If the next position is too far to the right, go to the next row
                // Except is this is the final element
                if(i != commits_by_month.length-1 && ((sign === 1 && along_X > W) || (sign === -1 && along_X < 0))) nextColumn()

                index++
            })//forEach

        function nextColumn() {
            row++
            row_index = 0
            sign *= -1
            along_X = sign === 1 ? 0 : W
            along_Y += 200 + padding
        }// function nextColumn

        // Just to be sure, but what is the final row's id
        let n_circles_determined = commits_by_month.filter(d => d.commit_positions_determined === true).length
        if(n_circles_determined > 0) row = commits_by_month[n_circles_determined - 1].row

        ///////////////////////////////////////////////////////////
        // Center the circles within each row
        for(let i = 0; i <= row; i++) {
            let circles = commits_by_month.filter(d => d.row === i)
            let row_width = d3.sum(circles, d => 2*d.r + padding) - padding
            let row_offset = (W - row_width) / 2
            circles.forEach(d => {
                d.x = d.x + row_offset * (i % 2 === 0 ? 1 : -1)
            })//forEach
        }//for i

        /////////////////////////////////////////////////////////////
        row_heights = []

        // Find the height offset of the first row
        let circles_top = commits_by_month.filter(d => d.row === 0)
        let largest_circle = d3.max(circles_top, d => d.r)
        let height_offset = largest_circle
        circles_top.forEach(d => {
            d.y = height_offset
        })//forEach
        // Save the height offset
        row_heights.push(height_offset)
        
        // Set the correct height by looking at the largest circle of the current row and the one above
        let largest_radius_current = largest_circle
        for(let i = 1; i <= row; i++) {
            let circles_above = commits_by_month.filter(d => d.row === i-1)
            let circles_current = commits_by_month.filter(d => d.row === i)
            let largest_radius_above = d3.max(circles_above, d => d.r)
            largest_radius_current = d3.max(circles_current, d => d.r)
            height_offset += largest_radius_above + padding_row + largest_radius_current
            circles_current.forEach(d => {
                d.y = height_offset
            })//forEach

            // Save the height offset
            row_heights.push(height_offset)
        }//for i

        // Reset the height of the canvas to fit all the circles
        let height_required = height_offset + largest_radius_current + 2*MARGIN.height
        height = height_required / PIXEL_RATIO

    }// function determineMonthPositionsAlongTimeline

    // Set the pixel positions of the commits on the page
    function setCommitBasePositions() {
        commits_by_month.forEach((d,i) => {
            commitBasePosition(d)
        })// forEach
    }// function setCommitBasePositions

    function commitBasePosition(d) {
        d.values.forEach(n => {
            n.x_base = d.x + n.x
            n.y_base = d.y + n.y
        })// forEach
    }// function commitBasePosition

    /////////////////////////////////////////////////////////////////
    /////////////////// General Drawing Functions ///////////////////
    /////////////////////////////////////////////////////////////////

    // Draw the background
    function drawBackground(context) {
        // Fill the background with a color
        context.fillStyle = COLOR_BACKGROUND
        context.fillRect(0, 0, WIDTH, HEIGHT)
    }// function drawBackground

    /////////////////////////////////////////////////////////////////
    //////////////////////////// Timeline ///////////////////////////
    /////////////////////////////////////////////////////////////////
    // Draw the timeline of a straight line per row with arcs at the end connecting to the row below it
    function drawTimeLine(context) {
        // Draw a line behind the circles to show how time connects them all
        createTimeLinePath()
        // context.strokeStyle = "#c2c2c2"
        context.strokeStyle = COLOR_REPO
        // context.globalAlpha = 0.1
        // context.lineWidth = 32 //MARGIN.width * 0.15
        // context.stroke()

        context.globalAlpha = 0.2
        context.lineWidth = 20 //MARGIN.width * 0.15
        context.stroke()

        context.globalAlpha = 1
        context.lineWidth = 5
        context.stroke()

        context.globalAlpha = 1
    } // function drawTimeLine

    // Draw a line behind the circles to show how time connects them all
    function createTimeLinePath() {
        let O = 0
        let radius = MARGIN.width * 0.7
        context.beginPath()
        context.moveTo(0-O, row_heights[0])
        for(let i = 0; i <= row_heights.length-1; i++) {
            let y = row_heights[i]
            let h_diff = (row_heights[i+1] - y)
            // It shouldn't be larger than the radius
            let R = min(radius, h_diff/2)

            // Draw a line from the left to the right
            // Add an arc at the end of each line to connect to the next row
            if(i % 2 === 0) { // Arc on the right side
                context.lineTo(W+O, y)
                // Don't do this for the last line
                if(i < row_heights.length-1) {
                    if(R === h_diff/2) {
                        // Half an arc
                        context.arc(W+O, y + R, R, -PI/2, PI/2)
                    } else {
                        // Two quarter arcs with a line in between
                        context.arc(W+O, y + R, R, -PI/2, 0)
                        context.lineTo(W+O + R, y + h_diff - R)
                        context.arc(W+O, y + h_diff - R, R, 0, PI/2)
                    }// else
                }// if
            } else { // Arc on the left side
                context.lineTo(0-O, y)
                // Don't do this for the last line
                if(i < row_heights.length-1) {
                    if(R === h_diff/2) {
                        // Half an arc
                        context.arc(0-20, y + R, R, 3*PI/2, PI/2, true)
                    } else {
                        // Two quarter arcs with a line in between
                        context.arc(0-O, y + R, R, 3*PI/2, PI, true)
                        context.lineTo(0-O - R, y + h_diff - R)
                        context.arc(0-O, y + h_diff - R, R, PI, PI/2, true)
                    }// else
                }// if
            }// else
        }//for i

    }// function createTimeLinePath

    /////////////////////////////////////////////////////////////////
    //////////////////// Circle Drawing Functions ///////////////////
    /////////////////////////////////////////////////////////////////

    // Draw all of the commit months
    function drawAllCommitMonths(context) {
        // Draw the months and the commits within
        commits_by_month.forEach((d, i) => {
            /////////////////////////////////////////////////////////
            // Draw the month circle
            if(INITIAL_CIRCLE_DRAW === true || FIRST_DRAW === false) {
                drawMonthCircle(context, d, i)
                // Add the date label
                monthDateLabel(context, d, i)
            }// if

            /////////////////////////////////////////////////////////
            // Draw the commit circles within each month
            if(FIRST_DRAW) {
                // Has the force simulation already been done?
                if(d.commit_circle_simulation) {
                    // If the "animation" of appearing isn't done yet, draw the commits on the hover canvas
                    if(!d.finished_appearing) {
                        drawInnerCommitCircles(context_hover, d)
                    } else if(d.finished_appearing && !d.drawn_on_main) {
                        // If it's done appearing and has an opacity of 1, draw it on the main canvas once
                        drawInnerCommitCircles(context, d)
                        d.drawn_on_main = true
                    }// else if
                }// if
            } else {
                drawInnerCommitCircles(context, d)
            }// else
        })//forEach
    }// function drawAllCommitMonths

    /////////////////////////////////////////////////////////////////
    // Draw a circle to contain all the commit circles
    function drawMonthCircle(context, d, i) {
        // Draw the month circle
        context.fillStyle = COLOR_BACKGROUND
        context.strokeStyle = COLOR_REPO

        drawCircle(context, d.x, d.y, d.r + 7, true, false)
        // Also stroke the somewhat larger circle
        context.lineWidth = 3
        context.globalAlpha = 0.5
        context.stroke()
        context.globalAlpha = 1

        // // Create a shadow/glow around the month circle
        // context.shadowBlur = 12
        // context.shadowColor = "#9fdbd9"
        // drawCircle(context, d.x, d.y, d.r + 6, true, false)
        // context.shadowBlur = 0

        // Stroke the main circle
        context.globalAlpha = 0.5
        context.lineWidth = 3
        drawCircle(context, d.x, d.y, d.r, true, true)
        // context.stroke()
        context.globalAlpha = 1
    }// function drawMonthCircle

    /////////////////////////////////////////////////////////////////
    // Draw all the commit circles within a month
    function drawInnerCommitCircles(context, d) {
        context.globalAlpha = d.opacity < 1 ? d.opacity : 1
        // Draw the commit circles within each month
        context.strokeStyle = COLOR_BACKGROUND
        context.lineWidth = 2
        d.values.forEach(n => {
            drawCommitCircle(context, n)
        })// forEach
        context.globalAlpha = 1
    }// function drawInnerCommitCircles

    // Draw the commits
    function drawCommitCircle(context, d) {
            if(d.files_changed === 0) {
                context.fillStyle = COLOR_OWNER
                drawCircle(context, d.x_base, d.y_base, d.radius_draw, true, false)
            } else {
                // Draw two circles, with the overlapping part in another color
                drawInsertDeleteCommitCircle(context, d)
            }// else

            if(d.is_release) {
                // context.strokeStyle = COLOR_REPO_MAIN
                if(d.files_changed === 0) context.strokeStyle = COLOR_OWNER
                else if(d.line_insertions > d.line_deletions) context.strokeStyle = COLOR_INSERTIONS
                else if(d.line_insertions < d.line_deletions) context.strokeStyle = COLOR_DELETIONS
                else context.strokeStyle = COLOR_OVERLAP

                let lw = 4
                context.lineWidth = lw
                drawCircle(context, d.x_base, d.y_base, d.radius - lw/2 - 4, true, true)
            }// if
    }// function drawCommitCircle

    /////////////////////////////////////////////////////////////////
    // Draw a single commit circle
    function drawInsertDeleteCommitCircle(context, n) {
        // Full circles with the overlapping part in another color
        if(n.radius_insertions > n.radius_deletions) {
            context.fillStyle = COLOR_INSERTIONS
            drawCircle(context, n.x_base, n.y_base, n.radius_insertions, true, false)
            context.fillStyle = COLOR_OVERLAP
            drawCircle(context, n.x_base, n.y_base, n.radius_deletions, true, false)
        } else {
            context.fillStyle = COLOR_DELETIONS
            drawCircle(context, n.x_base, n.y_base, n.radius_deletions, true, false)
            context.fillStyle = COLOR_OVERLAP
            drawCircle(context, n.x_base, n.y_base, n.radius_insertions, true, false)
        }// else
    }// function drawInsertDeleteCommitCircle

    ///////////////////////// Draw a circle /////////////////////////
    function drawCircle(context, x, y, r, begin = true, stroke = false) {
        if(begin === true) context.beginPath()
        context.moveTo((x+r), y)
        context.arc(x, y, r, 0, TAU)
        if(begin && !stroke) context.fill()
        else if(begin && stroke) context.stroke()
    }//function drawCircle

    /////////////////////////////////////////////////////////////////
    //////////////////////// Hover Functions ////////////////////////
    /////////////////////////////////////////////////////////////////
    // Setup the hover on the top canvas, get the mouse position and call the drawing functions
    function setupHover() {
        d3.select("#canvas-hover").on("mousemove", function(event) {
            // Get the position of the mouse on the canvas
            let [mx, my] = d3.pointer(event, this);
            let [d, FOUND] = findNode(mx, my);

            // Draw the hover state on the top canvas
            if(FOUND) {
                HOVER_ACTIVE = true
                HOVERED_NODE = d

                // // Fade out the main canvas, using CSS
                // canvas.style.opacity = '0.3'

                drawHoverState(context_hover, d)

            } else {
                HOVER_ACTIVE = false
                HOVERED_NODE = null

                context_hover.clearRect(0, 0, WIDTH, HEIGHT)
                // // Fade the main canvas back in
                // canvas.style.opacity = '1'
            }// else

        })// on mousemove

    }// function setupHover

    // Draw the hovered node and its links and neighbors and a tooltip
    function drawHoverState(context, d) {
        context.clearRect(0, 0, WIDTH, HEIGHT)
        context.save()
        context.translate(MARGIN.width, MARGIN.height)
            context.fillStyle = COLOR_BACKGROUND
            context.globalAlpha = 0.7
            drawCircle(context, d.month_data.x, d.month_data.y, d.month_data.r, true, false)
            context.globalAlpha = 1
            
            // Show the number of commits
            monthDateLabel(context_hover, d.month_data, d.month_data.index, true)

            // Draw the hovered commit circle
            drawCommitCircle(context, d)

            // Show a ring around the hovered node
            drawHoverRing(context, d)
        context.restore()
    }// function drawHoverState

    //////////////////////// Draw Hover Ring ////////////////////////
    // Draw a stroked ring around the hovered node
    function drawHoverRing(context, d) {
        let r = d.r + 10
        context.beginPath()
        context.moveTo((d.x_base + r), d.y_base)
        context.arc(d.x_base, d.y_base, r, 0, TAU)

        let COL
        if(d.files_changed === 0) COL = COLOR_OWNER
        else if (d.line_insertions > d.line_deletions) COL = COLOR_INSERTIONS
        else if (d.line_insertions < d.line_deletions) COL = COLOR_DELETIONS
        else COL = COLOR_OVERLAP
        context.strokeStyle = COL
        context.lineWidth = 8

        context.stroke()
    }// function drawHoverRing

    /////////////////////////////////////////////////////////////////
    //////////////////////// Click Functions ////////////////////////
    /////////////////////////////////////////////////////////////////


    /////////////////////////////////////////////////////////////////
    ///////////////// General Interaction Functions /////////////////
    /////////////////////////////////////////////////////////////////

    // Turn the mouse position into a canvas x and y location and see if it's close enough to a node
    function findNode(mx, my) {
        mx = ((mx * PIXEL_RATIO) - MARGIN.width)
        my = ((my * PIXEL_RATIO) - MARGIN.height)

        //Get the closest hovered node
        let point = delaunay.find(mx, my)
        let d = commits[point]

        // Get the distance from the mouse to the node
        let dist = sqrt((d.x_base - mx)**2 + (d.y_base - my)**2)
        // If the distance is too big, don't show anything
        let FOUND = dist < d.r + 40 //(CLICK_ACTIVE ? 10 : 50)

        if(FOUND) {
            console.log(d)
            // console.log(d.files_changed, d.line_insertions, d.line_deletions, d.lines_changed, d.commit_year, d.commit_month)
        }// if

        return [d, FOUND]
    }// function findNode

    /////////////////////////////////////////////////////////////////
    ///////////////////////// Text Functions ////////////////////////
    /////////////////////////////////////////////////////////////////

    // Add the year or month label to the month circles
    function monthDateLabel(context, d, i, show_commits = false) {
        context.fillStyle = COLOR_TEXT
        context.textAlign = "center"

        // Label for the year or month
        let text
        let y = d.y + d.r + 6
        if((i === 0 || i === commits_by_month.length-1) && d.month !== 0) {
            y += 18
            drawTickMark(6)
            context.textBaseline = "top"
            setFont(context, 23, 700, "normal")
            text = `${formatDate(d.values[0].commit_time)}`
            if(!show_commits) context.fillText(text, d.x, y)
            y += 26

        } else if(d.month === 0) {
            y += 18
            drawTickMark(6)
            context.textBaseline = "top"
            setFont(context, 30, 700, "normal")
            text = d.year
            if(!show_commits) context.fillText(text, d.x, y)
            y += 32

        } else {
            y += 16
            drawTickMark()
            // context.globalAlpha = 0.8
            context.textBaseline = "top"
            setFont(context, 23, 400, "normal")
            // text = `${formatDateNum(d.values[0].commit_time)}`
            text = `${formatMonth(d.values[0].commit_time)}`
            if(!show_commits) context.fillText(text, d.x, y)
            y += 26
        }// else

        function drawTickMark(offset = 4) {
            // Add a little line from the top to the circle
            context.beginPath()
            context.moveTo(d.x, d.y + d.r)
            context.lineTo(d.x, y - offset)
            context.globalAlpha = 0.7
            context.strokeStyle = COLOR_REPO
            context.lineWidth = 3
            context.stroke()
            context.globalAlpha = 1
        }// function drawTickMark


        // Label for the number of commits
        if(show_commits) {
            context.globalAlpha = 0.7
            setFont(context, 22, 400, "italic")
            context.fillText(`${d.n_commits} commits`, d.x, y)
        }// if

        context.globalAlpha = 1
    }// function monthDateLabel

    /////////////////////////////////////////////////////////////////
    ///////////////////////// Font Functions ////////////////////////
    /////////////////////////////////////////////////////////////////

    //////////////////// Different Font Settings ////////////////////
    function setFont(context, font_size, font_weight, font_style = "normal") {
        context.font = `${font_weight} ${font_style} ${font_size}px ${FONT_FAMILY}`
    }//function setFont

    ////////////// Add tracking (space) between letters /////////////
    function renderText(context, text, x, y, letterSpacing = 0, stroke = false) {
        //Based on http://jsfiddle.net/davidhong/hKbJ4/        
        let characters = String.prototype.split.call(text, '')
        let index = 0
        let current
        let currentPosition = x
        let alignment = context.textAlign

        let start_position
        let end_position

        let totalWidth = 0
        for (let i = 0; i < characters.length; i++) {
            totalWidth += context.measureText(characters[i]).width + letterSpacing
        }//for i

        if (alignment === "right") {
            currentPosition = x - totalWidth
        } else if (alignment === "center") {
            currentPosition = x - (totalWidth / 2)
        }//else if
        
        context.textAlign = "left"
        start_position = currentPosition
        while (index < text.length) {
            current = characters[index++]
            if(stroke) context.strokeText(current, currentPosition, y)
            context.fillText(current, currentPosition, y)
            currentPosition += context.measureText(current).width + letterSpacing
        }//while
        end_position = currentPosition - (context.measureText(current).width/2)
        context.textAlign = alignment

        return [start_position, end_position]
    }//function renderText
    
    /////////////////////////////////////////////////////////////////
    //////////////////////// Helper Functions ///////////////////////
    /////////////////////////////////////////////////////////////////

    // Add a delay so "stuff" is drawn to the canvas
    function delay(time) {
        return new Promise(resolve => setTimeout(resolve, time))
    }// function delay

    function mod (x, n) { return ((x % n) + n) % n }

    function sq(x) { return x * x }

    /////////////////////////////////////////////////////////////////
    /////////////////////// Accessor functions //////////////////////
    /////////////////////////////////////////////////////////////////

    chart.width = function (value) {
        if (!arguments.length) return width
        width = value
        return chart
    }// chart.width

    chart.repository = function (value) {
        if (!arguments.length) return REPO_CENTRAL
        REPO_CENTRAL = value
        return chart
    } // chart.repository

    return chart

}// function createORCAVisual
