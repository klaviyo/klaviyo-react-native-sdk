bootstrap=0
compile_ios=0
compile_android=0
install_sdk=0

while getopts d:c:n:bkia flag
do
    case "${flag}" in
        d) subdirectory=${OPTARG};;
        n) new_version=${OPTARG};;
        c) commit_hash=${OPTARG};;
        b) bootstrap=1;;
        k) install_sdk=1;;
        i) compile_ios=1;;
        a) compile_android=1;;
        *) echo "Invalid option $flag";;
    esac
done

# Executes a provided command in a specified project's build subdirectory, or all projects present in ./build/
function runInProjectOrAllProjects() {
  if [ -n "$subdirectory" ]; then
    (
      cd "build/$subdirectory" || exit
      project=${PWD##*/}
      eval "$1 $project"
    )
  else
    for d in build/*/; do
      (
        cd "$d" || exit
        project=${PWD##*/}
        eval "$1 $project"
      )
    done
  fi
}

# Install the Klaviyo SDK.
# Invoke this from the desired project's build subdirectory
function installKlaviyoSdk() {
  project=$1

  if [ -n "$commit_hash" ]; then
    echo "Installing Klaviyo SDK for $project at $commit_hash"
    npm install git@github.com:klaviyo/klaviyo-react-native-sdk.git#"$commit_hash"
    rm package-lock.json
  else
    echo "Installing Klaviyo SDK for $project"
    yarn add klaviyo-react-native-sdk
  fi
}

function boot() {
  (
    project=$1
    echo "Initializing $project:"

    echo "Add Klaviyo SDK and run yarn install"
    installKlaviyoSdk "$project"
    yarn install

    echo "Finished $project: verify the installation by checking the logs above."
  )
}

function installRnTestApp() {
  IFS=' ' read -r -a versions <<< "$1"
  for version in "${versions[@]}"; do
    project="KlaviyoTest_"$(echo "$version" | tr '.' '_')

    echo "Installing React Native Test App for $project"
    (
      cd "./build" || exit
      npx @react-native-community/cli init --version "$version" --title "$project" --install-pods true --skip-git-init --replace-directory true "$project"
      touch "./$project/yarn.lock"
    )

    runInProjectOrAllProjects "boot $project"
  done
}

if [ -n "$new_version" ]; then
   installRnTestApp "$new_version"
fi

if [[ bootstrap+compile_ios+compile_android+install_sdk -eq 0 ]]; then
  echo "No operations were specified, use
        -n to install new React Native version(s)
        -d to specify a single sub-directory for the following operations
        -b to bootstrap,
        -k to install the Klaviyo SDK
        -c to specify a commit hash for the Klaviyo SDK
        -i to compile for iOS
        -a to compile for Android
      Example: ./boot.sh -b to bootstrap all sub-directories"
  exit 0
fi

if [ "$bootstrap" -eq 1 ]; then
  runInProjectOrAllProjects boot
fi

if [ "$install_sdk" -eq 1 ]; then
  runInProjectOrAllProjects installKlaviyoSdk
fi

if [ "$compile_ios" -eq 1 ]; then
  function compile_ios() {
    project=$1
    echo "Run a clean pod install in $project"
    cd ios || exit
    rm -f ./Podfile.lock
    if (bundle exec pod install --repo-update > /dev/null); then
      echo "iOS Success on: $project"
      exit 0
    else
      echo "iOS FAILURE on: $project"
      exit 1
    fi
  }

  runInProjectOrAllProjects compile_ios
fi

if [ "$compile_android" -eq 1 ]; then
  function compile_android() {
    project=$1
    echo "Test gradle build on: $project"

    cd ./android || exit

    ./gradlew --stop
    ./gradlew -q clean

    if (./gradlew -q build -q > /dev/null); then
      echo "Android Success on: $project"
      exit 0
    else
      echo "Android FAILURE on: $project"
      exit 1
    fi
  }

  runInProjectOrAllProjects compile_android
fi

