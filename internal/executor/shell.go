package executor

import (
	"bufio"
	"context"
	"io"
	"os/exec"
	"sync"
)

// TaskStatus 表示异步任务的状态
type TaskStatus struct {
	ID         string   `json:"id"`
	IsRunning  bool     `json:"is_running"`
	ExitCode   int      `json:"exit_code"`
	Logs       []string `json:"logs"`
	mu         sync.RWMutex
}

func (s *TaskStatus) AddLog(line string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Logs = append(s.Logs, line)
}

func (s *TaskStatus) GetLogs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.Logs
}

// ExecuteCommand 执行命令并实时记录日志
func ExecuteCommand(ctx context.Context, status *TaskStatus, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	status.mu.Lock()
	status.IsRunning = true
	status.mu.Unlock()

	var wg sync.WaitGroup
	wg.Add(2)

	logWorker := func(r io.Reader) {
		defer wg.Done()
		scanner := bufio.NewScanner(r)
		for scanner.Scan() {
			status.AddLog(scanner.Text())
		}
	}

	go logWorker(stdout)
	go logWorker(stderr)

	wg.Wait()
	err = cmd.Wait()

	status.mu.Lock()
	status.IsRunning = false
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			status.ExitCode = exitError.ExitCode()
		} else {
			status.ExitCode = -1
		}
	} else {
		status.ExitCode = 0
	}
	status.mu.Unlock()

	return err
}

// ExecuteSimple 执行简单命令并返回输出
func ExecuteSimple(name string, args ...string) (string, error) {
	out, err := exec.Command(name, args...).CombinedOutput()
	return string(out), err
}
