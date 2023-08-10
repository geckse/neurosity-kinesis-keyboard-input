const { Neurosity } = require("@neurosity/sdk");
const dotenv = require("dotenv");
dotenv.config();
const { timer } = require("rxjs");
const { switchMap, scan } = require("rxjs/operators");

var robot = require("robotjs");

const neurosity = new Neurosity({
    timesync: true
});

const kinesisLabels = ["leftArm", "rightArm"];
const switchInterval = 100; // switch kinesis label every x ms

keyboard();

async function keyboard() {

    try {
        await neurosity.login({
            email: process.env.NEUROSITY_EMAIL,
            password: process.env.NEUROSITY_PASSWORD
        });
        console.log("Logged in");
    } catch (error) {
        console.log(error);
        return;
    }

    let needToToggleOff = false;

    const initialKinesis = kinesisLabels.reduce(
        (acc, label) => ({ ...acc, [label]: 0 }),
        {}
      );
    
      timer(0, switchInterval)
        .pipe(
          switchMap((i) => neurosity.predictions(kinesisLabels[i % 2])),
          scan(
            (acc, { label, probability }) => ({
              ...acc,
              [label]: probability,
            }),
            initialKinesis
          )
        )
        .subscribe((multipleKinesis) => {

            if (multipleKinesis.leftArm > 0.1) {
                console.log("rightArm ", multipleKinesis.leftArm);
                robot.keyTap("c");
                needToToggleOff = true;
            } else if(multipleKinesis.rightArm > 0.1) {
                console.log("leftArm ", multipleKinesis.rightArm);
                robot.keyTap("y");
                needToToggleOff = true;
            } else {
                console.log(multipleKinesis.leftArm+" <---> "+multipleKinesis.rightArm);
            }
        });

    setInterval(() => {
        console.log("---");
        if (needToToggleOff) {
            robot.keyTap("x");
            needToToggleOff = false;
        }
    }, 1000);

}