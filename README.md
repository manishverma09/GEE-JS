# GEE-JS

I have still not gotten into the habit of using functions across different projects and script files for the 
JavaScript API. I will add scripts here with small descriptions about what they do. I have not edited the scripts, so you might find some extra code and material that is only marginally related to the the main objective. Here are the details of what each file does:

(1) modMyd_ts.js: Creates a time series by stacking VIs from both Aqua and Tera MODIS and then interpolates to daily resolution with a Gaussian kernel. Change the kernel width if you want more or less smoothing. I chose the width after eyeballing the seasonal trajectories and local correlation. 

(2) landsat_footrpint_overlap.js: Find overlap in footrpint for different landsat sensors. 

