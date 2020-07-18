# Plugin-Submit-Test-js
A small test plugin to test the submit interface is working for SynBioHub. Could be the basis for javascript (Node.js) based submit plugins.

# Install
## Using docker
Run `docker run --publish 8091:5000 --detach --name js-test-plug synbiohub/plugin-submit-test-js:snapshot`
Check it is up using localhost:8091/status or post to localhost:8091/run.
